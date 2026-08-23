import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/settings.functions";
import { Megaphone } from "lucide-react";

export function AnnouncementBanner() {
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

  if (data?.announcement_banner_enabled !== "true" || !data?.announcement_banner_text) return null;

  return (
    <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
      <Megaphone size={13} className="shrink-0" />
      <span>{data.announcement_banner_text}</span>
    </div>
  );
}
