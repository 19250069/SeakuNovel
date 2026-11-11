import { HeroSection } from "../components/HeroSection";
import { GenreSection } from "../components/GenreSection";
import { FeaturedNovels } from "../components/FeaturedNovels";
import { WritingSection } from "../components/WritingSection";
import ContinueReading from "../components/ContinueReading";
import { useDocumentTitle } from "../../utils/seo";

export function Home() {
  useDocumentTitle(
    "Beranda",
    "SeakuNovel - Platform Web Novel Indonesia. Baca ribuan bab novel menarik dan publikasikan karyamu sendiri."
  );

  return (
    <>
      <HeroSection />
      <ContinueReading />
      <GenreSection />
      <FeaturedNovels />
      <WritingSection />
    </>
  );
}
