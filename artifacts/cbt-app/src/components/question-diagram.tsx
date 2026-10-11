import { useEffect, useState } from "react";

interface QuestionDiagramProps {
  imagePath: string;
  alt?: string;
  className?: string;
}

export function QuestionDiagram({ imagePath, alt = "Question diagram", className = "" }: QuestionDiagramProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setImageUrl(null);
    setFailed(false);

    const token = localStorage.getItem("cbt_token");
    if (!token) {
      setFailed(true);
      return () => { cancelled = true; };
    }

    fetch(`/api/storage${imagePath}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error("Image request failed");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  if (failed) return <p role="img" aria-label={alt} className="text-sm text-muted-foreground">Diagram could not be loaded.</p>;
  if (!imageUrl) return <div className={`text-sm text-muted-foreground ${className}`} role="status">Loading diagram…</div>;
  return <img src={imageUrl} alt={alt} className={className} />;
}
