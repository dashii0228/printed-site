import { uploadImageFile } from "../upload-image";
import { useAdminFetch } from "../use-admin-fetch";
import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Pencil, Save, X } from "lucide-react";
import { getImageUrl } from "../image-url";
import {
  mergePortfolioWork,
  PORTFOLIO_CATEGORIES,
  type PortfolioWorkItem,
  type PortfolioWorkOverride,
  type PrintCategory,
} from "../portfolio-data";

const portfolioCategoryLabels: Record<PrintCategory, string> = {
  laser: "Лазер",
  uv: "UV",
  dtf: "DTF",
  business: "Бизнес хэвлэл",
};

function portfolioImageSource(image: string) {
  return image.startsWith("/api/") || image.startsWith("https://") || image.startsWith("http://")
    ? image
    : getImageUrl(image, import.meta.env.BASE_URL);
}

export function PortfolioManager({ initialWorks }: { initialWorks: PortfolioWorkItem[] }) {
  const adminFetch = useAdminFetch();
  const [works, setWorks] = useState(initialWorks);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<PortfolioWorkItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminFetch("/api/admin/portfolio")
      .then(async (response) => {
        if (!response.ok) throw new Error("Бүтээлийн сангийн жагсаалтыг ачаалж чадсангүй.");
        return response.json() as Promise<PortfolioWorkOverride[]>;
      })
      .then((changes) => {
        if (active) {
          setWorks(mergePortfolioWork(initialWorks, changes));
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialWorks, adminFetch]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const startEdit = (work: PortfolioWorkItem) => {
    setEditing(work);
    setImageFile(null);
    setMessage("");
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setImageFile(null);
  };

  const saveWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage("");

    try {
      let image = editing.image;
      if (imageFile) {
        const uploadResponse = await adminFetch("/api/admin/portfolio-images/upload-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: imageFile.type, size: imageFile.size }),
        });
        const upload = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(upload.error || "Зураг байршуулах холбоос үүссэнгүй.");

        await uploadImageFile(upload, imageFile);

        const imageId = String(upload.imageUrl).split("/").pop();
        const completeResponse = await adminFetch("/api/admin/portfolio-images/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: imageId }),
        });
        const completed = await completeResponse.json();
        if (!completeResponse.ok) throw new Error(completed.error || "Зургийг нийтэлж чадсангүй.");
        image = completed.imageUrl;
      }

      const response = await adminFetch(`/api/admin/portfolio/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          title: editing.title.trim(),
          description: editing.description.trim(),
          category: editing.category,
        }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Бүтээлийн мэдээллийг хадгалж чадсангүй.");
      setWorks((current) => mergePortfolioWork(current, [saved as PortfolioWorkOverride]));
      setEditing(null);
      setImageFile(null);
      setMessage("Бүтээлийн мэдээлэл хадгалагдлаа.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Хадгалах үед алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-product-manager admin-portfolio-manager" aria-labelledby="admin-portfolio-heading">
      <div className="admin-products-heading">
        <div>
          <p className="eyebrow">БҮТЭЭЛИЙН САН</p>
          <h2 id="admin-portfolio-heading">Одоо байгаа бүтээл засах</h2>
        </div>
        <p className="admin-portfolio-hint">Бүтээл нэмэх, хасах боломжгүй.</p>
      </div>
      {loadError && <p className="admin-manager-state admin-manager-error" role="alert">{loadError}</p>}
      {loading ? (
        <p className="admin-manager-state" role="status">Бүтээлийн сан ачаалж байна…</p>
      ) : (
        <div className="admin-product-list">
          {works.map((work) => (
            <article className="admin-product-row" key={work.id}>
              <img src={portfolioImageSource(work.image)} alt="" />
              <div className="admin-product-row-copy">
                <span>{portfolioCategoryLabels[work.category]}</span>
                <h3>{work.title}</h3>
              </div>
              <button type="button" className="admin-edit-button" onClick={() => startEdit(work)}>
                <Pencil size={15} /> Засах
              </button>
            </article>
          ))}
        </div>
      )}
      {message && <p className="admin-manager-state" role="status">{message}</p>}

      {editing && (
        <div className="admin-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditor();
        }}>
          <section className="admin-product-editor" role="dialog" aria-modal="true" aria-labelledby="portfolio-editor-title">
            <div className="admin-editor-heading">
              <div>
                <p className="eyebrow">БҮТЭЭЛИЙН САН</p>
                <h2 id="portfolio-editor-title">Бүтээлийн мэдээлэл засах</h2>
              </div>
              <button type="button" className="admin-editor-close" onClick={closeEditor} aria-label="Хаах">
                <X size={20} />
              </button>
            </div>
            <form className="admin-product-form" onSubmit={saveWork}>
              <label>
                Гарчиг
                <input
                  required
                  maxLength={160}
                  value={editing.title}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                />
              </label>
              <label>
                Тайлбар
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                />
              </label>
              <label>
                Ангилал
                <select
                  value={editing.category}
                  onChange={(event) => setEditing({ ...editing, category: event.target.value as PrintCategory })}
                >
                  {PORTFOLIO_CATEGORIES.filter((category) => category.id !== "all").map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Зураг солих
                <span className="admin-image-picker">
                  <ImagePlus size={18} />
                  <span>{imageFile?.name ?? "Зураг сонгох"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      if (file && file.size > 8 * 1024 * 1024) {
                        setImageFile(null);
                        setMessage("Зургийн хэмжээ 8 MB-аас бага байх ёстой.");
                        event.currentTarget.value = "";
                        return;
                      }
                      if (file && !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
                        setImageFile(null);
                        setMessage("PNG, JPG, WEBP эсвэл GIF зураг сонгоно уу.");
                        event.currentTarget.value = "";
                        return;
                      }
                      setMessage("");
                      setImageFile(file);
                    }}
                  />
                </span>
                {imagePreview ? (
                  <img className="admin-image-preview" src={imagePreview} alt="Сонгосон зургийн урьдчилсан харагдац" />
                ) : (
                  <img className="admin-image-preview" src={portfolioImageSource(editing.image)} alt={`${editing.title} одоогийн зураг`} />
                )}
              </label>
              {message && <p className="admin-form-message" role="alert">{message}</p>}
              <div className="admin-editor-actions">
                <button type="button" className="admin-secondary-button" onClick={closeEditor} disabled={saving}>Болих</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>
                  <Save size={16} /> {saving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
