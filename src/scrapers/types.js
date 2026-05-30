/**
 * @typedef {Object} Job
 * @property {string} id          - unique: "{source}_{urlHash}"
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} source      - "indeed" | "remotive"
 * @property {string} url
 * @property {string} postedAt    - ISO 8601 date string
 * @property {string} dateText    - human label e.g. "2 days ago"
 * @property {string} [salary]    - optional
 * @property {string} [jobType]   - "full-time" | "part-time" | "remote" | "contract"
 * @property {string} [experience]
 */

export {};
