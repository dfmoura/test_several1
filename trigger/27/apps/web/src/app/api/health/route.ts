import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "orcamento-flexo",
    time: new Date().toISOString(),
  });
}
