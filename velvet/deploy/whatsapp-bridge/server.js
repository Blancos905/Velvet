/**
 * Bridge HTTP: riceve il payload inviato da Velvet (NotificationWhatsappDispatcher)
 * e inoltra a Meta WhatsApp Cloud API o Twilio.
 *
 * Avvio: VELVET_BRIDGE_PROVIDER=meta|twilio|log node server.js
 * Porta: PORT (default 3099)
 */
const http = require("http");
const { URL } = require("url");

const PORT = parseInt(process.env.PORT || "3099", 10);
const PROVIDER = (process.env.VELVET_BRIDGE_PROVIDER || "log").toLowerCase();
const INBOUND_BEARER = (process.env.VELVET_BRIDGE_BEARER_TOKEN || "").trim();

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			if (!raw.trim()) {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(raw));
			} catch (e) {
				reject(e);
			}
		});
		req.on("error", reject);
	});
}

function sendJson(res, status, obj) {
	const body = JSON.stringify(obj);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(body),
	});
	res.end(body);
}

function checkBearer(req) {
	if (!INBOUND_BEARER) {
		return true;
	}
	const h = req.headers.authorization || "";
	const m = /^Bearer\s+(.+)$/i.exec(h.trim());
	const token = m ? m[1].trim() : "";
	return token === INBOUND_BEARER;
}

async function sendMeta(to, message) {
	const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
	const phoneId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
	if (!token || !phoneId) {
		throw new Error("WHATSAPP_CLOUD_ACCESS_TOKEN e WHATSAPP_CLOUD_PHONE_NUMBER_ID sono obbligatori per provider=meta");
	}
	const toDigits = String(to).replace(/\D/g, "");
	const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messaging_product: "whatsapp",
			to: toDigits,
			type: "text",
			text: { preview_url: false, body: message },
		}),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`Meta API ${res.status}: ${text}`);
	}
	return text ? JSON.parse(text) : {};
}

async function sendTwilio(to, message) {
	const sid = process.env.TWILIO_ACCOUNT_SID;
	const auth = process.env.TWILIO_AUTH_TOKEN;
	const from = process.env.TWILIO_WHATSAPP_FROM;
	if (!sid || !auth || !from) {
		throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM sono obbligatori per provider=twilio");
	}
	const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
	const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
	const form = new URLSearchParams();
	form.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
	form.set("To", toWa);
	form.set("Body", message);
	const basic = Buffer.from(`${sid}:${auth}`).toString("base64");
	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basic}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: form.toString(),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`Twilio API ${res.status}: ${text}`);
	}
	return text ? JSON.parse(text) : {};
}

async function handleVelvetPayload(body) {
	const to = body.to;
	const message = body.message;
	if (!to || String(to).trim() === "") {
		throw new Error("Campo 'to' mancante o vuoto");
	}
	if (!message || String(message).trim() === "") {
		throw new Error("Campo 'message' mancante o vuoto");
	}

	switch (PROVIDER) {
		case "meta":
			return sendMeta(String(to).trim(), String(message));
		case "twilio":
			return sendTwilio(String(to).trim(), String(message));
		case "log":
		default:
			console.log(
				JSON.stringify({
					level: "info",
					event: "whatsapp_log_only",
					to: String(to).trim(),
					appointmentId: body.appointmentId,
					notificationType: body.notificationType,
					messagePreview: String(message).slice(0, 200),
				})
			);
			return { ok: true, provider: "log" };
	}
}

const server = http.createServer(async (req, res) => {
	const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

	if (req.method === "GET" && (u.pathname === "/health" || u.pathname === "/")) {
		sendJson(res, 200, {
			ok: true,
			service: "velvet-whatsapp-bridge",
			provider: PROVIDER,
		});
		return;
	}

	if (req.method !== "POST") {
		sendJson(res, 405, { error: "Method not allowed" });
		return;
	}

	const paths = ["/", "/webhooks/whatsapp", "/v1/whatsapp"];
	if (!paths.includes(u.pathname)) {
		sendJson(res, 404, { error: "Not found" });
		return;
	}

	if (!checkBearer(req)) {
		sendJson(res, 401, { error: "Unauthorized" });
		return;
	}

	try {
		const body = await readJsonBody(req);
		const result = await handleVelvetPayload(body);
		sendJson(res, 200, { ok: true, result });
	} catch (e) {
		console.error("[velvet-whatsapp-bridge]", e.message || e);
		sendJson(res, 400, { ok: false, error: String(e.message || e) });
	}
});

server.listen(PORT, "0.0.0.0", () => {
	console.log(
		`velvet-whatsapp-bridge in ascolto su :${PORT} provider=${PROVIDER} bearer=${INBOUND_BEARER ? "on" : "off"}`
	);
});
