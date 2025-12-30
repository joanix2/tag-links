import { AppLayout } from "@/components/layouts/AppLayout";
import { ProfileInformation } from "@/components/profile/ProfileInformation";
import { APITokensSection } from "@/components/profile/APITokensSection";
import { DangerZone } from "@/components/profile/DangerZone";

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-10 px-4 max-w-3xl animate-slide-in">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

        <ProfileInformation />

        <div className="mt-6">
          <APITokensSection />
        </div>

        <div className="mt-6">
          <DangerZone />
        </div>
      </div>
    </AppLayout>
  );
}
