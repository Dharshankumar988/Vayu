fetch("http://localhost:3000/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "login", email: "admin@vayu.com", password: "admin123" })
}).then(res => res.json()).then(data => console.log(data));
