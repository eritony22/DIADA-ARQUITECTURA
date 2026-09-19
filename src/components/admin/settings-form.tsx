"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { SiteSettings, Service, Stat } from "@/types/content";
import ImageUploader from "./image-uploader";

const ICON_OPTIONS = ["compass", "hard-hat", "sofa", "clipboard-check"];
const DEFAULT_TEASER_IMAGE = "/images/projects/piscina-campestre/board-02-nocturna.webp";
const DEFAULT_PAGE_IMAGE = "/images/projects/beauty-studio-cafe/board-01.webp";

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [company, setCompany] = useState(settings.company);
  const [hero, setHero] = useState(settings.hero);
  const [about, setAbout] = useState({
    ...settings.about,
    teaserImage: settings.about.teaserImage || DEFAULT_TEASER_IMAGE,
    pageImage: settings.about.pageImage || DEFAULT_PAGE_IMAGE,
  });
  const [services, setServices] = useState<Service[]>(settings.services);
  const [stats, setStats] = useState<Stat[]>(settings.stats);
  const [storyText, setStoryText] = useState(settings.about.story.join("\n\n"));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = {
      company: {
        ...company,
        phones: splitList(company.phones.join(",")),
        emails: splitList(company.emails.join(",")),
      },
      hero,
      about: {
        ...about,
        story: storyText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
      },
      services,
      stats,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("No se pudo guardar la configuración");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Empresa</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Razón social" value={company.legalName} onChange={(v) => setCompany({ ...company, legalName: v })} />
          <Field label="Nombre comercial" value={company.tradeName} onChange={(v) => setCompany({ ...company, tradeName: v })} />
          <Field label="RUC" value={company.ruc} onChange={(v) => setCompany({ ...company, ruc: v })} />
          <Field label="Instagram" value={company.instagram} onChange={(v) => setCompany({ ...company, instagram: v })} />
          <Field
            label="Teléfonos (separados por coma)"
            value={company.phones.join(", ")}
            onChange={(v) => setCompany({ ...company, phones: splitList(v) })}
          />
          <Field
            label="Correos (separados por coma)"
            value={company.emails.join(", ")}
            onChange={(v) => setCompany({ ...company, emails: splitList(v) })}
          />
          <Field label="Dirección" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} />
          <Field label="Ciudad" value={company.city} onChange={(v) => setCompany({ ...company, city: v })} />
          <Field label="Región" value={company.region} onChange={(v) => setCompany({ ...company, region: v })} />
          <Field label="País" value={company.country} onChange={(v) => setCompany({ ...company, country: v })} />
          <Field
            label="Búsqueda para el mapa"
            value={company.mapQuery}
            onChange={(v) => setCompany({ ...company, mapQuery: v })}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Portada (Hero)</h2>
        <div className="mt-5 space-y-5">
          <Field label="Texto superior (kicker)" value={hero.kicker} onChange={(v) => setHero({ ...hero, kicker: v })} />
          <Field label="Título principal" value={hero.title} onChange={(v) => setHero({ ...hero, title: v })} />
          <Field label="Título destacado (segunda línea)" value={hero.highlight} onChange={(v) => setHero({ ...hero, highlight: v })} />
          <TextArea label="Subtítulo" value={hero.subtitle} onChange={(v) => setHero({ ...hero, subtitle: v })} rows={3} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">Quiénes somos</h2>
        <div className="mt-5 space-y-5">
          <Field label="Texto superior (kicker)" value={about.kicker} onChange={(v) => setAbout({ ...about, kicker: v })} />
          <TextArea label="Introducción" value={about.intro} onChange={(v) => setAbout({ ...about, intro: v })} rows={3} />
          <TextArea
            label="Historia (separa párrafos con una línea en blanco)"
            value={storyText}
            onChange={setStoryText}
            rows={6}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextArea label="Misión" value={about.mission} onChange={(v) => setAbout({ ...about, mission: v })} rows={3} />
            <TextArea label="Visión" value={about.vision} onChange={(v) => setAbout({ ...about, vision: v })} rows={3} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageField
              label="Foto junto a 'Quiénes somos' (portada)"
              value={about.teaserImage}
              onUploaded={(url) => setAbout({ ...about, teaserImage: url })}
            />
            <ImageField
              label="Foto en la página /nosotros"
              value={about.pageImage}
              onUploaded={(url) => setAbout({ ...about, pageImage: url })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Valores</h2>
          <AddButton
            onClick={() =>
              setAbout({
                ...about,
                values: [...about.values, { title: "", description: "" }],
              })
            }
          />
        </div>
        <div className="mt-5 space-y-4">
          {about.values.map((value, i) => (
            <ListItemCard
              key={i}
              onRemove={() =>
                setAbout({ ...about, values: about.values.filter((_, idx) => idx !== i) })
              }
            >
              <Field
                label="Título"
                value={value.title}
                onChange={(v) => updateAt(about.values, i, { ...value, title: v }, (values) => setAbout({ ...about, values }))}
              />
              <TextArea
                label="Descripción"
                value={value.description}
                rows={2}
                onChange={(v) =>
                  updateAt(about.values, i, { ...value, description: v }, (values) =>
                    setAbout({ ...about, values }),
                  )
                }
              />
            </ListItemCard>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Equipo</h2>
          <AddButton
            onClick={() =>
              setAbout({
                ...about,
                team: [...about.team, { name: "", role: "", bio: "" }],
              })
            }
          />
        </div>
        <div className="mt-5 space-y-4">
          {about.team.map((member, i) => (
            <ListItemCard
              key={i}
              onRemove={() =>
                setAbout({ ...about, team: about.team.filter((_, idx) => idx !== i) })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  value={member.name}
                  onChange={(v) =>
                    updateAt(about.team, i, { ...member, name: v }, (team) => setAbout({ ...about, team }))
                  }
                />
                <Field
                  label="Cargo"
                  value={member.role}
                  onChange={(v) =>
                    updateAt(about.team, i, { ...member, role: v }, (team) => setAbout({ ...about, team }))
                  }
                />
              </div>
              <TextArea
                label="Bio"
                value={member.bio}
                rows={2}
                onChange={(v) =>
                  updateAt(about.team, i, { ...member, bio: v }, (team) => setAbout({ ...about, team }))
                }
              />
            </ListItemCard>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Servicios</h2>
          <AddButton
            onClick={() =>
              setServices([
                ...services,
                { id: `servicio-${services.length + 1}`, title: "", description: "", icon: "compass" },
              ])
            }
          />
        </div>
        <div className="mt-5 space-y-4">
          {services.map((service, i) => (
            <ListItemCard
              key={service.id + i}
              onRemove={() => setServices(services.filter((_, idx) => idx !== i))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Título"
                  value={service.title}
                  onChange={(v) => updateAt(services, i, { ...service, title: v }, setServices)}
                />
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
                    Ícono
                  </label>
                  <select
                    value={service.icon}
                    onChange={(e) => updateAt(services, i, { ...service, icon: e.target.value }, setServices)}
                    className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm focus:border-clay focus:outline-none"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <TextArea
                label="Descripción"
                value={service.description}
                rows={2}
                onChange={(v) => updateAt(services, i, { ...service, description: v }, setServices)}
              />
            </ListItemCard>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Estadísticas</h2>
          <AddButton
            onClick={() => setStats([...stats, { label: "", value: "", suffix: "" }])}
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {stats.map((stat, i) => (
            <ListItemCard key={i} onRemove={() => setStats(stats.filter((_, idx) => idx !== i))}>
              <Field
                label="Etiqueta"
                value={stat.label}
                onChange={(v) => updateAt(stats, i, { ...stat, label: v }, setStats)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Valor"
                  value={stat.value}
                  onChange={(v) => updateAt(stats, i, { ...stat, value: v }, setStats)}
                />
                <Field
                  label="Sufijo"
                  value={stat.suffix ?? ""}
                  onChange={(v) => updateAt(stats, i, { ...stat, suffix: v }, setStats)}
                />
              </div>
            </ListItemCard>
          ))}
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-bone shadow-lg transition-colors hover:bg-clay disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saved ? "Guardado ✓" : saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function updateAt<T>(list: T[], index: number, value: T, setList: (list: T[]) => void) {
  setList(list.map((item, i) => (i === index ? value : item)));
}

function ImageField({
  label,
  value,
  onUploaded,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <div className="flex flex-col gap-3">
        {value && (
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-line">
            <Image src={value} alt="" fill className="object-cover" />
          </div>
        )}
        <ImageUploader
          multiple={false}
          label="Reemplazar imagen"
          onUploaded={(files) => {
            if (files[0]) onUploaded(files[0].url);
          }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone">
        {label}
      </label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bone px-4 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-ink"
    >
      <Plus size={14} />
      Agregar
    </button>
  );
}

function ListItemCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="relative space-y-3 rounded-xl border border-line bg-bone p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-line text-stone hover:border-red-300 hover:text-red-600"
      >
        <Trash2 size={13} />
      </button>
      <div className="pr-8">{children}</div>
    </div>
  );
}
