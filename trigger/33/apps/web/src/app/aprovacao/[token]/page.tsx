import { AprovacaoClient } from "./AprovacaoClient";

export default async function AprovacaoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AprovacaoClient token={token} />;
}
