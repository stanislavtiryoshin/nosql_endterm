const puppeteer = require("puppeteer");
const axios = require("axios");
const HTMLParser = require("node-html-parser");
const fs = require("fs");

function write(array, path) {
  fs.writeFileSync(path, JSON.stringify(array));
}

function read(path) {
  const fileContent = fs.readFileSync(path);
  const array = JSON.parse(fileContent);
  return array;
}

(async () => {
  const getProducts = async (page) => {
    await page.waitForSelector("a.product-card__image-link");

    return await page.$$eval("a.product-card__image-link", (spans) => {
      return [...spans].map((span) => {
        return span.href;
      });
    });
  };

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://book24.ru/catalog/");

  let urls = await getProducts(page);
  await page.waitForSelector("a.pagination__item._link.smartLink");

  const getUrls = async (page) => {
    for (let i = 2; i <= 50; i++) {
      await page.goto(`https://book24.ru/catalog/page-${i}`);
      await page.waitForSelector("a.pagination__item._link.smartLink");
      const nextUrls = await getProducts(page);
      urls = urls.concat(nextUrls);
    }
    write(urls, "./urls.txt");
  };

  await getUrls(page);

  let totalUrls = read("./urls.txt");

  const getData = async () => {
    let data = [];

    for (let i = 0; i <= 800; i++) {
      setTimeout(() => {
        axios.get(totalUrls[i]).then(function (response) {
          const html = response.data;
          const parsed = HTMLParser.parse(html);

          let featuresValues = [];

          parsed
            .querySelectorAll(".product-characteristic__value")
            .map((value, index) => {
              featuresValues.push(value);
            });

          const obj = {
            Название: parsed
              .querySelector(".product-detail-page__title")
              ?.text.trim()
              .slice(
                parsed
                  .querySelector(".product-detail-page__title")
                  ?.text.indexOf(":") + 1,
                parsed.querySelector(".product-detail-page__title")?.text
                  .length - 1
              ),
            Цена: parsed
              .querySelector(".app-price.product-sidebar-price__price")
              ?.text.replace(/\D/g, "")
              .trim()
              .replace(/,/g, "."),
            Рейтинг: parsed
              .querySelector(".rating-widget__main-text")
              ?.text.trim(),
            "Кол-во оценок": parsed
              .querySelector(".rating-widget__other-text")
              ?.text.replace(/\D/g, "")
              .trim(),
            "Кол-во отзывов": parsed
              .querySelector(
                ".reviews-widget.product-ratings-widget__item > .reviews-widget__main-text"
              )
              ?.text.trim(),
            Продажи: parsed
              .querySelector(".product-detail-page__purchased-text")
              ?.text.replace(/\D/g, "")
              .trim(),
          };

          parsed
            .querySelectorAll(".product-characteristic__label")
            .map((feature, index) => {
              obj[feature.text.replace(":", "").trim()] =
                featuresValues[index].text.trim();
            });

          data.push(obj);
          if (i === 750) {
            write(data, "./test.json");
            console.log("Done! Check test.json file");
          }
        });
      }, 1000);
    }
    return data;
  };

  await getData();
})();
