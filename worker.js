export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleContact(request, env);
    }

    // Allt annat serveras som vanligt från de statiska filerna
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Ogiltig förfrågan." }, 400);
  }

  const name = (data.name || "").toString().trim();
  const email = (data.email || "").toString().trim();
  const message = (data.message || "").toString().trim();

  if (!name || !email || !message) {
    return json({ error: "Alla fält krävs." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Ogiltig e-postadress." }, 400);
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return json({ error: "Ett fält är för långt." }, 400);
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "R3born Tech kontaktformulär <kontakt@r3borntech.se>",
      to: ["charlie@r3borntech.se"],
      reply_to: email,
      subject: `Nytt meddelande från ${name}`,
      text: `Namn: ${name}\nE-post: ${email}\n\n${message}`,
    }),
  });

  if (!resendRes.ok) {
    return json({ error: "Kunde inte skicka meddelandet just nu." }, 502);
  }

  return json({ ok: true }, 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
