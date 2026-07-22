const r = await fetch("http://127.0.0.1:8080/api/employee/getAllEmployee");
const data = await r.json();
const summary = data.slice(0, 6).map((e) => ({
  emp: e.employee_id,
  name: e.first_name,
  has: e.has_profile_image,
  id: e._id,
}));
console.log(JSON.stringify({ total: data.length, withFlag: data.filter((e) => e.has_profile_image).length, summary }, null, 2));

const target =
  data.find((e) => e.has_profile_image) ||
  data.find((e) => e.employee_id === "EMP001") ||
  data[0];

console.log("target", target?.employee_id, target?._id, "has", target?.has_profile_image);

const imgRes = await fetch(
  `http://127.0.0.1:8080/api/employee/profileImage/${target._id}`
);
const imgText = await imgRes.text();
console.log("img status", imgRes.status, "len", imgText.length, "start", imgText.slice(0, 80));
