const ADMIN_USER = "mbadmin";
const ADMIN_SALT = "c83b467fb61d4c0b714d8e7c8db0ff85";
const ADMIN_PASSWORD_HASH = "a9a0d234c8f233240601ad53f1d3e483596875e796da9a802d0a64e6a984063f";

export const config = {
  matcher: ["/admin", "/admin.html"],
};

function unauthorized() {
  return new Response("Admin login required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MB Show Sponsor Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default async function middleware(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return unauthorized();
  }

  const splitAt = decoded.indexOf(":");
  if (splitAt < 1) return unauthorized();

  const user = decoded.slice(0, splitAt);
  const password = decoded.slice(splitAt + 1);
  const passwordHash = await sha256(`${ADMIN_SALT}:${password}`);

  if (user !== ADMIN_USER || !timingSafeEqual(passwordHash, ADMIN_PASSWORD_HASH)) {
    return unauthorized();
  }

  return undefined;
}
