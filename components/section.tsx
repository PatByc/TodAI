type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black tracking-tight text-gray-950">{title}</h1>
      {children}
    </section>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm shadow-gray-200/80">{children}</div>;
}
