import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesNewsArticleFilter } from "../web/src/lib/newsFilters";

const articles = [
  ...["nvidia", "amd-gpu", "amd-chipset", "intel-gpu", "software-amp", "software-codecs", "software-obs"].map((sourceType) => ({ sourceType })),
  ...["nas-synology", "nas-ugreen"].map((sourceType) => ({ sourceType })),
  ...["tech-computerbase", "tech-hardwareluxx", "tech-heise", "tech-golem", "tech-winfuture"].map((sourceType) => ({ sourceType })),
  { sourceType: "steam" },
  { sourceType: "minecraft", isPatchnotes: true },
];

test("News category tabs only return their own source types", () => {
  const filter = (name: "drivers" | "nas" | "tech") => articles.filter((article) => matchesNewsArticleFilter(article, name));
  assert.equal(filter("drivers").length, 7);
  assert.equal(filter("nas").length, 2);
  assert.equal(filter("tech").length, 5);
  assert.ok(filter("drivers").every((article) => !article.sourceType.startsWith("tech-") && !article.sourceType.startsWith("nas-")));
  assert.ok(filter("nas").every((article) => article.sourceType.startsWith("nas-")));
  assert.equal(articles.filter((article) => matchesNewsArticleFilter(article, "patchnotes")).length, 1);
  assert.equal(articles.filter((article) => matchesNewsArticleFilter(article, "all")).length, articles.length);
});