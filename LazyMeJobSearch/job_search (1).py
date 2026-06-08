"""
========================================================
  AI-POWERED JOB SEARCH TOOL
  Built for: Tejas Mokarkar
  API: Tavily Search (Free tier: 1000 queries/month)
  What it does:
    1. Parses your resume PDF to extract skills
    2. Builds smart search queries from those skills
    3. Hits Tavily Search API to find real job listings
    4. Scores and ranks each result by relevance
    5. Prints a clean table of the best matches
    6. Tracks monthly query usage (stays under 1000)
========================================================

HOW TO RUN:
    python3 job_search.py

REQUIREMENTS:
    pip install requests pdfplumber colorama tabulate tavily-python
========================================================
"""

import requests
import pdfplumber
import re
import json
import time
import os
from datetime import datetime
from tabulate import tabulate
from colorama import Fore, Style, init
from tavily import TavilyClient

init(autoreset=True)

# ─────────────────────────────────────────────
#  CONFIGURATION  ← Edit these
# ─────────────────────────────────────────────
TAVILY_API_KEY  = "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"
RESUME_PDF_PATH = "resume.pdf"
TARGET_CITY     = "Pune"
WORK_MODE       = "any"           # "remote" | "onsite" | "hybrid" | "any"
JOB_ROLE        = "Backend Developer"
RESULTS_PER_QUERY = 5             # Tavily returns up to 10 per call
MAX_QUERIES       = 6             # 6 queries × 5 results = 30 raw results per run

# ─────────────────────────────────────────────
#  FREE TIER USAGE TRACKER
#  Saves a local JSON file to track how many
#  Tavily queries you've used this month.
#  Stops you from accidentally exceeding 1000.
# ─────────────────────────────────────────────
USAGE_FILE        = "tavily_usage.json"
MONTHLY_LIMIT     = 1000   # Tavily free tier limit

def load_usage() -> dict:
    """Load usage data from local file."""
    if os.path.exists(USAGE_FILE):
        with open(USAGE_FILE, "r") as f:
            return json.load(f)
    return {"month": datetime.now().strftime("%Y-%m"), "count": 0}

def save_usage(data: dict):
    """Save usage data to local file."""
    with open(USAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def check_and_update_usage(queries_needed: int) -> bool:
    """
    Checks if we have enough quota left this month.
    Resets counter if it's a new month.
    Returns True if safe to proceed, False if limit reached.
    """
    usage = load_usage()
    current_month = datetime.now().strftime("%Y-%m")

    # Reset if new month
    if usage["month"] != current_month:
        usage = {"month": current_month, "count": 0}
        print(f"  {Fore.GREEN}✓ New month detected — usage counter reset to 0{Style.RESET_ALL}")

    used       = usage["count"]
    remaining  = MONTHLY_LIMIT - used
    after_run  = used + queries_needed

    print(f"\n{Fore.CYAN}━━━ Tavily Free Tier Usage ━━━{Style.RESET_ALL}")
    print(f"  Used this month : {Fore.YELLOW}{used}{Style.RESET_ALL} / {MONTHLY_LIMIT}")
    print(f"  This run needs  : {Fore.YELLOW}{queries_needed}{Style.RESET_ALL} queries")
    print(f"  Remaining after : {Fore.YELLOW}{remaining - queries_needed}{Style.RESET_ALL} queries")

    # Build a simple visual bar
    filled  = int((used / MONTHLY_LIMIT) * 30)
    bar     = "█" * filled + "░" * (30 - filled)
    color   = Fore.GREEN if used < 700 else (Fore.YELLOW if used < 900 else Fore.RED)
    print(f"  [{color}{bar}{Style.RESET_ALL}] {int((used/MONTHLY_LIMIT)*100)}% used")

    if after_run > MONTHLY_LIMIT:
        print(f"\n  {Fore.RED}✗ LIMIT REACHED — This run needs {queries_needed} queries but only {remaining} remain.{Style.RESET_ALL}")
        print(f"  {Fore.YELLOW}  Resets on the 1st of next month.{Style.RESET_ALL}")
        return False

    # Update and save
    usage["count"] = after_run
    save_usage(usage)
    return True

# ─────────────────────────────────────────────
#  SKILL KEYWORDS (used to parse resume)
# ─────────────────────────────────────────────
KNOWN_SKILLS = [
    # Languages
    "java", "python", "javascript", "typescript", "node.js", "nodejs",
    # Frameworks / Backend
    "spring boot", "spring mvc", "express.js", "expressjs", "microservices",
    "rest api", "restful", "hibernate", "jpa", "spring framework",
    # Frontend
    "react", "react.js", "html", "css",
    # AI / ML
    "llm", "langchain", "rag", "openai", "gemini", "claude", "vector database",
    "pinecone", "chromadb", "prompt engineering", "agentic ai", "chatbot",
    # Messaging / Streaming
    "kafka", "apache kafka", "rabbitmq", "event-driven",
    # Databases
    "mysql", "postgresql", "mongodb", "sql",
    # DevOps / Cloud
    "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins",
    "git", "maven", "postman", "vercel",
    # Platforms
    "whatsapp cloud api", "meta api",
    # Methodology
    "agile", "scrum",
]

# ─────────────────────────────────────────────
#  STEP 1: PARSE RESUME PDF
# ─────────────────────────────────────────────
def parse_resume(pdf_path: str) -> dict:
    """
    Opens the PDF, extracts all text, then scans it
    for known skill keywords. Also extracts years of experience.
    """
    print(f"\n{Fore.CYAN}[1/4] Parsing resume: {pdf_path}{Style.RESET_ALL}")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += (page.extract_text() or "") + "\n"
    except FileNotFoundError:
        print(f"{Fore.RED}ERROR: Could not find '{pdf_path}'.{Style.RESET_ALL}")
        raise SystemExit(1)

    text_lower = full_text.lower()

    found_skills = [s for s in KNOWN_SKILLS if s.lower() in text_lower]

    exp_matches = re.findall(r'(\d+)\+?\s*years?\s*of\s*experience', text_lower)
    years_exp   = max([int(x) for x in exp_matches], default=0)

    print(f"  {Fore.GREEN}✓ Extracted {len(found_skills)} skills{Style.RESET_ALL}")
    print(f"  {Fore.GREEN}✓ Detected ~{years_exp}+ years of experience{Style.RESET_ALL}")
    print(f"  Skills: {', '.join(found_skills[:12])}{'...' if len(found_skills) > 12 else ''}")

    return {"raw_text": full_text, "skills": found_skills, "years_exp": years_exp}


# ─────────────────────────────────────────────
#  STEP 2: BUILD SEARCH QUERIES
# ─────────────────────────────────────────────
def build_queries(resume_data: dict) -> list:
    """
    Builds targeted search queries from resume skills.
    Each query targets a different job board / angle.
    """
    print(f"\n{Fore.CYAN}[2/4] Building search queries...{Style.RESET_ALL}")

    skills_lower   = [s.lower() for s in resume_data["skills"]]
    priority_skills = []
    for s in ["spring boot", "kafka", "node.js", "java", "microservices", "langchain", "rag"]:
        if s in skills_lower:
            priority_skills.append(s)
        if len(priority_skills) == 3:
            break

    skill_str = " ".join(priority_skills[:2]) if priority_skills else "java spring boot"

    queries = [
        f"{JOB_ROLE} {skill_str} jobs {TARGET_CITY} 2026",
        f"Java Spring Boot Kafka backend developer {TARGET_CITY} hiring 2026",
        f"Node.js backend developer {TARGET_CITY} microservices REST API jobs 2026",
        f"AI backend developer LLM RAG {TARGET_CITY} OR remote jobs 2026",
        f"Java microservices developer {TARGET_CITY} site:linkedin.com OR site:naukri.com",
        f"backend developer {TARGET_CITY} {skill_str} apply now 2026",
    ]

    if WORK_MODE in ("remote", "any"):
        queries.append("remote backend developer Java Spring Boot India 2026")

    queries = queries[:MAX_QUERIES]

    for i, q in enumerate(queries, 1):
        print(f"  {i}. {Fore.YELLOW}{q}{Style.RESET_ALL}")

    return queries


# ─────────────────────────────────────────────
#  STEP 3: SEARCH VIA TAVILY API
# ─────────────────────────────────────────────
def search_tavily(client: TavilyClient, query: str) -> list:
    """
    Calls Tavily Search API.
    Uses 'news' topic for freshness + include_answer=False to save tokens.
    Each call = 1 query credit.

    Tavily docs: https://docs.tavily.com/docs/python-sdk/tavily-search
    """
    try:
        response = client.search(
            query          = query,
            search_depth   = "basic",        # "basic" = 1 credit | "advanced" = 2 credits
            max_results    = RESULTS_PER_QUERY,
            include_answer = False,           # Don't waste credits on AI summary
            include_raw_content = False,
        )
        results = response.get("results", [])
        return [
            {
                "title"      : r.get("title", ""),
                "url"        : r.get("url", ""),
                "description": r.get("content", "")[:200],
                "score"      : 0,
                "age"        : r.get("published_date", "Recent"),
            }
            for r in results
        ]
    except Exception as e:
        print(f"  {Fore.RED}✗ Tavily error: {e}{Style.RESET_ALL}")
        return []


def collect_all_results(queries: list, resume_data: dict) -> list:
    """
    Runs all queries through Tavily, deduplicates by URL,
    scores each one, returns sorted list.
    """
    print(f"\n{Fore.CYAN}[3/4] Searching via Tavily API...{Style.RESET_ALL}")

    client     = TavilyClient(api_key=TAVILY_API_KEY)
    all_results = []
    seen_urls   = set()

    for i, query in enumerate(queries, 1):
        print(f"  Query {i}/{len(queries)}: ", end="", flush=True)
        results = search_tavily(client, query)
        new = 0
        for r in results:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                r["relevance_score"] = score_result(r, resume_data)
                r["query"]           = query
                all_results.append(r)
                new += 1
        print(f"{Fore.GREEN}+{new} new results{Style.RESET_ALL}")
        time.sleep(0.3)

    all_results.sort(key=lambda x: x["relevance_score"], reverse=True)
    print(f"\n  {Fore.GREEN}✓ Total unique results: {len(all_results)}{Style.RESET_ALL}")
    return all_results


# ─────────────────────────────────────────────
#  STEP 4: SCORE EACH RESULT
# ─────────────────────────────────────────────
def score_result(result: dict, resume_data: dict) -> int:
    """
    Scores each result by relevance to the resume.
    Skill match  → +1 per skill found in title/description
    Job keywords → +0.5 each
    Trusted job boards → +3 bonus
    Irrelevant pages   → -5 penalty
    """
    score  = 0
    text   = (result["title"] + " " + result["description"]).lower()
    skills = [s.lower() for s in resume_data["skills"]]

    for skill in skills:
        if skill in text:
            score += 1

    job_keywords = ["hiring", "apply", "job", "developer", "engineer",
                    "vacancy", "opening", "position", "salary", "lpa", "remote"]
    for kw in job_keywords:
        if kw in text:
            score += 0.5

    trusted_domains = ["linkedin.com", "naukri.com", "indeed.com", "glassdoor",
                       "greenhouse.io", "careers.", "jobs.", "instahyre", "hirist",
                       "wellfound", "cutshort", "unstop"]
    for domain in trusted_domains:
        if domain in result["url"]:
            score += 3

    irrelevant = ["tutorial", "course", "learn", "training", "certification",
                  "resume sample", "template", "example resume", "how to write"]
    for word in irrelevant:
        if word in text:
            score -= 5

    return round(score)


# ─────────────────────────────────────────────
#  STEP 5: DISPLAY RESULTS
# ─────────────────────────────────────────────
def display_results(results: list, resume_data: dict):
    """
    Prints a ranked table. Top 3 get a ★.
    Saves full results to job_results.json.
    """
    print(f"\n{Fore.CYAN}[4/4] Top Job Matches{Style.RESET_ALL}")
    print("=" * 100)

    if not results:
        print(f"{Fore.RED}No results found.{Style.RESET_ALL}")
        return

    top = results[:20]
    table_data = []

    for i, r in enumerate(top, 1):
        marker  = f"★ " if i <= 3 else "  "
        title   = r["title"][:52] + "..." if len(r["title"]) > 52 else r["title"]
        url     = r["url"][:42]   + "..." if len(r["url"])   > 42 else r["url"]
        snippet = r["description"][:65] + "..." if len(r["description"]) > 65 else r["description"]

        table_data.append([
            f"{marker}{i}",
            title,
            url,
            snippet,
            f"{r['relevance_score']}pts",
            r.get("age", "?")
        ])

    headers = ["#", "Title", "URL", "Snippet", "Score", "Posted"]
    print(tabulate(table_data, headers=headers, tablefmt="simple"))

    print("\n" + "=" * 100)
    print(f"{Fore.GREEN}Matched skills: {', '.join(resume_data['skills'][:10])}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}Tip: Copy any URL above and open it in your browser to apply.{Style.RESET_ALL}")

    # Save to JSON
    with open("job_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"{Fore.GREEN}✓ Full results saved to: job_results.json{Style.RESET_ALL}\n")


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
def main():
    print(f"\n{Fore.CYAN}{'=' * 60}")
    print("   AI-POWERED JOB SEARCH TOOL  (Powered by Tavily)")
    print(f"   Role: {JOB_ROLE} | City: {TARGET_CITY} | Mode: {WORK_MODE}")
    print(f"{'=' * 60}{Style.RESET_ALL}")

    # Check usage BEFORE hitting the API
    if not check_and_update_usage(MAX_QUERIES):
        return

    # Step 1 — Parse resume
    resume_data = parse_resume(RESUME_PDF_PATH)

    # Step 2 — Build queries
    queries = build_queries(resume_data)

    # Step 3 — Search
    results = collect_all_results(queries, resume_data)

    # Step 4 — Display
    display_results(results, resume_data)


if __name__ == "__main__":
    main()
