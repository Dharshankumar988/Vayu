fetch("http://127.0.0.1:3000/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "list_all" })
}).then(res => res.json()).then(data => console.log(data));
