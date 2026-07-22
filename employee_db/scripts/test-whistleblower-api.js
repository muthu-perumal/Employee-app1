const base = "http://127.0.0.1:8080/api/whistleblower";

const createRes = await fetch(base, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    isAnonymous: false,
    reporterName: "Test User",
    reporterEmail: "test.user@ezofis.com",
    submitterEmail: "test.user@ezofis.com",
    category: "Other",
    description: "API smoke test report",
    attachments: [],
  }),
});
console.log("create", createRes.status, await createRes.text());

const reviewerRes = await fetch(
  `${base}?viewerEmail=${encodeURIComponent("arun@ezofis.com")}`
);
const reviewerData = await reviewerRes.json();
console.log("reviewer list", reviewerRes.status, reviewerData.reports?.length);

const otherRes = await fetch(
  `${base}?viewerEmail=${encodeURIComponent("other@ezofis.com")}`
);
const otherData = await otherRes.json();
console.log("other list", otherRes.status, otherData.reports?.length);
