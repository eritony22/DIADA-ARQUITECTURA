import AdminShell from "@/components/admin/admin-shell";
import { getUnreadCount } from "@/lib/messages";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unread = await getUnreadCount();
  return <AdminShell unreadMessages={unread}>{children}</AdminShell>;
}
