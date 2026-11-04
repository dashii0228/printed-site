import { useEffect, useState, type FormEvent } from "react";
import { useAdminFetch } from "../use-admin-fetch";
import { ArrowRight, ArrowUpRight, ImagePlus, Pencil, Plus, Save, ShieldCheck, X } from "lucide-react";
import { Link } from "wouter";
import { SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { getImageUrl } from "../image-url";
import type { PortfolioWorkItem } from "../portfolio-data";
import { PortfolioManager } from "./portfolio-admin";
import { uploadImageFile } from "../upload-image";
import { filterDeletedEntries, loadCatalogDeletions } from "../catalog-deletions";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const imageUrl = (name: string) => getImageUrl(name, import.meta.env.BASE_URL);

export type AdminManagedProduct = {
  id: string;
  sortOrder: number;
  image: string;
  additionalImages?: { image: string; label: string }[];
  name: string;
  category: string;
  desc: string;
  details: string;
  specs: { label: string; value: string }[];
  features: string[];
};

export function SignInPage() {
  const { isLoaded } = useUser();
  const signInPath = `${basePath}/sign-in`;
  const signUpPath = `${basePath}/sign-up`;

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <Link href="/" className="auth-brand" aria-label="Printed нүүр хуудас">
          <img src={imageUrl("header-logo.png")} alt="Printed" />
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">PRINTED · БҮРТГЭЛ</p>
          <h1>Нэвтрэх</h1>
          <p>Нэвтэрч админ эрхийнхээ төлөвийг шалгана уу.</p>
        </div>
        {isLoaded
          ? <SignIn routing="path" path={signInPath} signUpUrl={signUpPath} fallbackRedirectUrl={`${basePath}/admin`} />
          : <p className="auth-loading" role="status">Нэвтрэх хэсэг ачаалж байна…</p>}
        <Link className="auth-home-link" href="/">Сайт руу буцах</Link>
      </div>
    </main>
  );
}

export function SignUpPage() {
  const { isLoaded } = useUser();
  const signInPath = `${basePath}/sign-in`;
  const signUpPath = `${basePath}/sign-up`;

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <Link href="/" className="auth-brand" aria-label="Printed нүүр хуудас">
          <img src={imageUrl("header-logo.png")} alt="Printed" />
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">PRINTED · БҮРТГЭЛ</p>
          <h1>Бүртгүүлэх</h1>
          <p>Хэрэглэгч бүртгүүлж болно. Админ эрхийг сервер тусад нь баталгаажуулна.</p>
        </div>
        {isLoaded
          ? <SignUp routing="path" path={signUpPath} signInUrl={signInPath} />
          : <p className="auth-loading" role="status">Бүртгэлийн хэсэг ачаалж байна…</p>}
        <Link className="auth-home-link" href="/">Сайт руу буцах</Link>
      </div>
    </main>
  );
}

type AdminAccessState = "checking" | "admin" | "denied" | "error";

export function AdminPage({
  initialProducts,
  initialPortfolio,
}: {
  initialProducts: AdminManagedProduct[];
  initialPortfolio: PortfolioWorkItem[];
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const adminFetch = useAdminFetch();
  const [access, setAccess] = useState<AdminAccessState>("checking");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let active = true;
    setAccess("checking");
    adminFetch("/api/admin/access")
      .then((response) => {
        if (!active) return;
        setAccess(response.ok ? "admin" : response.status === 403 ? "denied" : "error");
      })
      .catch(() => {
        if (active) setAccess("error");
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id, adminFetch]);

  if (!isLoaded || (isSignedIn && access === "checking")) {
    return (
      <main className="admin-page">
        <p className="admin-message" role="status">Нэвтрэх эрхийг шалгаж байна…</p>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="admin-page">
        <section className="admin-message">
          <p className="eyebrow">PRINTED · АДМИН</p>
          <h1>Нэвтрэх шаардлагатай</h1>
          <p>Админ хэсгийг үзэхийн тулд эхлээд бүртгэлдээ нэвтэрнэ үү.</p>
          <Link className="button button-red" href="/sign-in">
            Нэвтрэх <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" className="admin-brand" aria-label="Printed нүүр хуудас">
          <img src={imageUrl("header-logo.png")} alt="Printed" />
        </Link>
        <button type="button" onClick={() => void signOut({ redirectUrl: basePath || "/" })}>
          Гарах
        </button>
      </header>
      <section className="admin-content">
        <p className="eyebrow">PRINTED · АДМИН</p>
        <h1>Админ эрх</h1>
        {access === "admin" ? (
          <>
            <div className="admin-status-card">
              <ShieldCheck size={27} aria-hidden="true" />
              <div>
                <h2>Админ эрх баталгаажлаа</h2>
                <p>Энэ бүртгэлд серверээр админ эрх олгогдсон байна.</p>
              </div>
            </div>
            <p className="admin-account">
              Нэвтэрсэн бүртгэл:{" "}
              <strong>{user?.primaryEmailAddress?.emailAddress ?? "Бүртгэлтэй хэрэглэгч"}</strong>
            </p>
            <p className="admin-notice">
              Бүтээгдэхүүн нэмэх, мэдээлэл болон зураг засах, бүтээгдэхүүн болон бүтээл устгах эрх зөвхөн админд нээлттэй.
            </p>
            <ProductManager initialProducts={initialProducts} />
            <PortfolioManager initialWorks={initialPortfolio} />
          </>
        ) : access === "denied" ? (
          <>
            <div className="admin-status-card admin-status-denied">
              <ShieldCheck size={27} aria-hidden="true" />
              <div>
                <h2>Админ эрхгүй бүртгэл</h2>
                <p>Энэ бүртгэлд сайтын админ эрх олгогдоогүй байна.</p>
              </div>
            </div>
            <p className="admin-account">
              Нэвтэрсэн бүртгэл:{" "}
              <strong>{user?.primaryEmailAddress?.emailAddress ?? "Бүртгэлтэй хэрэглэгч"}</strong>
            </p>
          </>
        ) : (
          <>
            <div className="admin-status-card admin-status-error">
              <ShieldCheck size={27} aria-hidden="true" />
              <div>
                <h2>Эрх шалгаж чадсангүй</h2>
                <p>Сервер админ эрхийг баталгаажуулж чадсангүй. Дахин оролдоно уу.</p>
              </div>
            </div>
            <button
              type="button"
              className="admin-retry"
              onClick={() => {
                setAccess("checking");
                adminFetch("/api/admin/access")
                  .then((response) => setAccess(response.ok ? "admin" : response.status === 403 ? "denied" : "error"))
                  .catch(() => setAccess("error"));
              }}
            >
              Дахин шалгах
            </button>
          </>
        )}
      </section>
    </main>
  );
}

const adminProductCategories = [
  "Термо сав ба аяга",
  "Дэвтэр ба үзэг",
  "Сет",
  "Тэмдэг, медаль",
  "Түлхүүрийн оосор",
  "Зүүлт",
  "Карт холдер",
  "Үнэмлэх",
  "Даавуун тор",
  "Цаасан уут",
  "Бусад",
];

function mergeAdminProducts(
  initial: AdminManagedProduct[],
  stored: AdminManagedProduct[],
) {
  const storedById = new Map(stored.map((product) => [product.id, product]));
  const initialIds = new Set(initial.map((product) => product.id));
  const existing = initial.map((product, index) => ({
    ...product,
    ...storedById.get(product.id),
    sortOrder: storedById.get(product.id)?.sortOrder ?? product.sortOrder ?? index,
  }));
  const added = stored.filter((product) => !initialIds.has(product.id));
  return [...existing, ...added].sort((a, b) => a.sortOrder - b.sortOrder);
}

function productImageSource(image: string) {
  return image.startsWith("/api/") || image.startsWith("https://") || image.startsWith("http://")
    ? image
    : imageUrl(image);
}

function ProductManager({ initialProducts }: { initialProducts: AdminManagedProduct[] }) {
  const adminFetch = useAdminFetch();
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<AdminManagedProduct | null>(null);
  const [specsText, setSpecsText] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminFetch("/api/admin/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("Бүтээгдэхүүний жагсаалтыг ачаалж чадсангүй.");
        return response.json() as Promise<AdminManagedProduct[]>;
      }), loadCatalogDeletions()])
      .then(([stored, deletions]) => {
        if (active) {
          setProducts(filterDeletedEntries(mergeAdminProducts(initialProducts, stored),
            deletions, "product", (item) => item.id));
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
  }, [initialProducts, adminFetch]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const startNew = () => {
    const nextOrder = Math.max(-1, ...products.map((product) => product.sortOrder)) + 1;
    setEditing({
      id: crypto.randomUUID(),
      sortOrder: nextOrder,
      image: "",
      additionalImages: [],
      name: "",
      category: adminProductCategories[0],
      desc: "",
      details: "",
      specs: [],
      features: [],
    });
    setSpecsText("");
    setFeaturesText("");
    setImageFile(null);
    setMessage("");
  };

  const startEdit = (product: AdminManagedProduct) => {
    setEditing(product);
    setSpecsText(product.specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n"));
    setFeaturesText(product.features.join("\n"));
    setImageFile(null);
    setMessage("");
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setImageFile(null);
  };

  const deleteProduct = async (product: AdminManagedProduct) => {
    if (deletingId || !window.confirm(`“${product.name}” бүтээгдэхүүнийг устгах уу?\nБаталсны дараа сайтаас хасагдана. Зургийн файл устахгүй.`)) return;
    setDeletingId(product.id);
    setMessage("");
    try {
      const response = await adminFetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Бүтээгдэхүүнийг устгаж чадсангүй. Дахин оролдоно уу.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage(`“${product.name}” бүтээгдэхүүн устгагдлаа.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Устгах үед алдаа гарлаа.");
    } finally {
      setDeletingId(null);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage("");

    try {
      const specs = specsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf(":");
          if (separator < 1 || !line.slice(separator + 1).trim()) {
            throw new Error("Үзүүлэлтийг “Нэр: Утга” хэлбэрээр оруулна уу.");
          }
          return {
            label: line.slice(0, separator).trim(),
            value: line.slice(separator + 1).trim(),
          };
        });
      const features = featuresText.split("\n").map((line) => line.trim()).filter(Boolean);
      let image = editing.image;

      if (!imageFile && !image.trim()) {
        throw new Error("Үндсэн зураг сонгоно уу.");
      }

      if (imageFile) {
        const uploadResponse = await adminFetch("/api/admin/product-images/upload-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: imageFile.type, size: imageFile.size }),
        });
        const upload = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(upload.error || "Зураг байршуулах холбоос үүссэнгүй.");

        await uploadImageFile(upload, imageFile);

        const imageId = String(upload.imageUrl).split("/").pop();
        const completeResponse = await adminFetch("/api/admin/product-images/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: imageId }),
        });
        const completed = await completeResponse.json();
        if (!completeResponse.ok) throw new Error(completed.error || "Зургийг нийтэлж чадсангүй.");
        image = completed.imageUrl;
      }

      const payload = { ...editing, image, specs, features };
      const response = await adminFetch(`/api/admin/products/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Бүтээгдэхүүнийг хадгалж чадсангүй.");
      setProducts((current) =>
        [...current.filter((product) => product.id !== saved.id), saved]
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setEditing(null);
      setImageFile(null);
      setMessage("Бүтээгдэхүүний мэдээлэл хадгалагдлаа.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Хадгалах үед алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-product-manager" aria-labelledby="admin-products-heading">
      <div className="admin-products-heading">
        <div>
          <p className="eyebrow">КАТАЛОГ</p>
          <h2 id="admin-products-heading">Бүтээгдэхүүн удирдах</h2>
        </div>
        <button type="button" className="admin-primary-button" onClick={startNew} disabled={deletingId !== null}>
          <Plus size={17} /> Шинэ бүтээгдэхүүн
        </button>
      </div>
      {message && <p className="admin-manager-state" role="status">{message}</p>}
      {loading ? (
        <p className="admin-manager-state" role="status">Бүтээгдэхүүн ачаалж байна…</p>
      ) : loadError ? (
        <p className="admin-manager-state admin-manager-error" role="alert">{loadError}</p>
      ) : (
        <div className="admin-product-list">
          {products.map((product) => (
            <article className="admin-product-row" key={product.id}>
              <img src={productImageSource(product.image)} alt="" />
              <div className="admin-product-row-copy">
                <span>{product.category}</span>
                <h3>{product.name}</h3>
              </div>
              <div className="admin-row-actions">
              <button type="button" className="admin-edit-button" onClick={() => startEdit(product)} disabled={deletingId !== null}>
                <Pencil size={15} /> Засах
              </button>
              <button type="button" className="admin-edit-button admin-delete-button"
                disabled={deletingId !== null} onClick={() => void deleteProduct(product)}
                aria-label={`Устгах: ${product.name}`}>
                {deletingId === product.id ? "Устгаж байна…" : "Устгах"}
              </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !loadError && products.length === 0 && <p className="admin-manager-state">Бүтээгдэхүүн байхгүй байна.</p>}
      {editing && (
        <div className="admin-editor-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEditor();
        }}>
          <section className="admin-product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
            <div className="admin-editor-heading">
              <div>
                <p className="eyebrow">БҮТЭЭГДЭХҮҮН</p>
                <h2 id="product-editor-title">{products.some((product) => product.id === editing.id) ? "Мэдээлэл засах" : "Шинэ бүтээгдэхүүн"}</h2>
              </div>
              <button type="button" className="admin-editor-close" onClick={closeEditor} aria-label="Хаах"><X size={20} /></button>
            </div>
            <form className="admin-product-form" onSubmit={saveProduct}>
              <label>
                Нэр
                <input required maxLength={160} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              </label>
              <label>
                Ангилал
                <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>
                  {adminProductCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                Товч тайлбар
                <textarea required rows={2} maxLength={1000} value={editing.desc} onChange={(event) => setEditing({ ...editing, desc: event.target.value })} />
              </label>
              <label>
                Дэлгэрэнгүй танилцуулга
                <textarea required rows={4} maxLength={5000} value={editing.details} onChange={(event) => setEditing({ ...editing, details: event.target.value })} />
              </label>
              <label>
                Үзүүлэлтүүд
                <textarea rows={4} value={specsText} onChange={(event) => setSpecsText(event.target.value)} placeholder={"Багтаамж: 500мл\nМатериал: Ган"} />
                <small>Мөр бүрийг “Нэр: Утга” хэлбэрээр бичнэ.</small>
              </label>
              <label>
                Онцлогууд
                <textarea rows={3} value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} placeholder="Мөр бүрд нэг онцлог" />
              </label>
              <label>
                Үндсэн зураг солих
                <span className="admin-image-picker">
                  <ImagePlus size={18} />
                  <span>{imageFile?.name ?? "Зураг сонгох"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      if (file && file.size > 8 * 1024 * 1024) {
                        setMessage("Зургийн хэмжээ 8 MB-аас бага байх ёстой.");
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
                ) : editing.image ? (
                  <img className="admin-image-preview" src={productImageSource(editing.image)} alt={`${editing.name} одоогийн зураг`} />
                ) : null}
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

