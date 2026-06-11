import { notFound } from "next/navigation"
import { buildMemberDetail } from "@/lib/standings/member"
import { readMatches, readHistory } from "@/lib/standings/snapshot"
import { MemberDetailView } from "@/components/MemberDetail"
import { Modal } from "@/components/Modal"

export const dynamic = "force-dynamic"

export default async function MemberModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [matches, history] = await Promise.all([readMatches(), readHistory()])
  const detail = buildMemberDetail(id, matches ?? [], history)
  if (!detail) notFound()

  return (
    <Modal>
      <MemberDetailView detail={detail} />
    </Modal>
  )
}
