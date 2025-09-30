import SecureLinkForm from "@/components/SecureLinkForm";
import Pattern from "@/components/Pattern";

export default function Home() {
  return (
    <main className="p-4">
      <Pattern />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <SecureLinkForm />
      </div>
    </main>
  );
}
