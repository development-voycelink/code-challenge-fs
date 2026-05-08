import { NextResponse } from 'next/server';

const CALL_SERVICE_URL =
  process.env.NEXT_PUBLIC_CALL_SERVICE_URL ?? 'http://localhost:3001';

export async function GET(_request: Request) {
  // Hago este step para que no se exponga el CALL_SERVICE_URL directamente al cliente
  const response = await fetch(`${CALL_SERVICE_URL}/api/calls`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
