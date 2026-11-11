import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { HistoryButton } from "@/components/history-drawer-context";
import { BrandLink } from "@/components/new-text-context";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 pr-2 pl-4 sm:px-6">
        <BrandLink />
        <div className="flex items-center gap-1.5">
          {session?.user && <HistoryButton />}
          <ModeToggle />
          {session?.user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                variant="ghost"
                type="submit"
                className="h-9 px-3 max-sm:size-11 max-sm:px-0 max-sm:[&_svg:not([class*='size-'])]:size-5"
              >
                <LogOut />
                <span className="max-sm:sr-only">Sign out</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
