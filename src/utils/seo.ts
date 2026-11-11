import { useEffect } from "react";

export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} | SeakuNovel` : "SeakuNovel - Platform Web Novel Indonesia";
    document.title = fullTitle;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }
  }, [title, description]);
}

export default useDocumentTitle;
