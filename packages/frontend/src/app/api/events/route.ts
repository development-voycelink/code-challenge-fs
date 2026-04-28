import { NextResponse } from 'next/server';

const CALL_SERVICE_URL =
  process.env.NEXT_PUBLIC_CALL_SERVICE_URL ?? 'http://localhost:3001';

export async function POST(request: Request) {
  const apiKey = process.env.CALL_SERVICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Missing CALL_SERVICE_API_KEY in frontend server environment' },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const response = await fetch(`${CALL_SERVICE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: payload,
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}
