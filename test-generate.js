const body = {
  data: {
    name: "Test User",
    email: "test@test.com"
  },
  jobDescription: "React Developer",
  companyName: "Google",
  includeCoverLetter: true,
  includeATS: true
};

fetch('http://localhost:3000/api/generate-all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
