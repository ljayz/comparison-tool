require("dotenv").config();
const express = require("express");
const postgres = require("postgres");
const { flatten, slice, zip } = require("ramda");
const fs = require("fs");
const cors = require("cors");

const app = express();
const sql = postgres(process.env.POSTGRES);
const port = process.env.PORT;
const table = process.env.STAGE === "dev" ? "comparison" : "comparison";
const tableConfig =
  process.env.STAGE === "dev" ? "comparison_config" : "comparison_config";
const log = (...arg) => {
  if (process.env.STAGE === "dev") {
    console.log(...arg);
  }
};
const getProductUrl = (product) => {
  const replaceNameShopee = (data) => {
    return data.replace(/[\s"&,]+/g, "-").replace(/-+/g, "-");
  };
  const replaceNameLazada = (data) => {
    return data
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
  };

  if (product.site === "lazada") {
    return `https://www.lazada.com.ph/products/${replaceNameLazada(product.name)}-i${product.itemid}-s${product.shopid}.html`;
  } else if (product.site === "shopee") {
    return `https://shopee.ph/${replaceNameShopee(product.name)}-i.${product.shopid}.${product.itemid}`;
  }
};
const getNeededData = (data) => {
  const {
    site = "",
    name = "",
    itemid = 0,
    shopid = 0,
    brand = "",
    rating = 0,
    sold = "",
    price = 0,
    review = "",
    stock = "",
    location = "",
    image,
    images,
  } = data;

  const url = getProductUrl(data);

  return {
    site,
    name,
    itemid,
    shopid,
    brand,
    rating: Number(rating),
    sold,
    price,
    review,
    stock,
    location,
    image,
    images,
    url,
  };
};
const roundToNearestWholeNumber = (number) => {
  const digitLength = String(parseInt(number)).length;
  const nearestNumber = Number(String(1).padEnd(digitLength, 0));

  return Math.ceil(number / nearestNumber) * nearestNumber;
};

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("It works!");
});

app.get("/about", async (req, res) => {
  const [about] = await sql`
    SELECT *
    FROM ${sql(tableConfig)}
    WHERE "key"='about'`;

  res.send(about.value ? about.value : "No data found");
});

app.get("/tampermonkey", async (req, res) => {
  let data = fs.readFileSync("./tampermonkey.txt", "utf8");
  const regexArr = [
    "@name         Comparison System",
    "Save products from shopee and lazada to comparison system",
    "const isDev = true;",
  ];
  const replaceArr = [
    "@name         Price Pro System",
    "Save products from shopee and lazada to price pro system",
    "const isDev = false;",
  ];
  for (const key in regexArr) {
    data = data.replace(regexArr[key], replaceArr[key]);
  }
  res.send(data);
});

//get all products limit 10
app.get("/products", async (req, res) => {
  try {
    const page = req.query?.page || "1";
    const search = req.query?.search || "";
    const minPrice = req.query?.minPrice ?? 0;
    const maxPrice = req.query?.maxPrice ?? 10000;
    const isFilter = req.query?.isFilter ?? false;

    if (isNaN(Number(page))) {
      res.json({ status: "success", message: "No products found", data: [] });
      return;
    }

    let whereArr = [],
      where;
    if (isFilter) {
      if (search) {
        whereArr.push(
          sql`LOWER(name) LIKE ${`%${search.toLowerCase()}%`}`.raw(),
        );
      }
      if (!isNaN(Number(minPrice)) && minPrice >= 0) {
        whereArr.push(sql`price>=${Number(minPrice)}`.raw());
      }
      if (!isNaN(Number(maxPrice)) && maxPrice >= 0) {
        whereArr.push(sql`price<=${Number(maxPrice)}`.raw());
      }
      if (whereArr.length) {
        for (const whereStmt of whereArr) {
          if (where) {
            where = sql`${where} AND ${whereStmt}`.raw();
          } else {
            where = sql`WHERE ${whereStmt}`.raw();
          }
        }
      }
      // console.log(where);
    }

    const limit = 10;
    const offset = isNaN(Number(page)) ? 0 : (Number(page) - 1) * limit;
    const products = await sql`
      SELECT *
      FROM ${sql(table)}
      ${where ? sql`${where}` : sql``}
      ORDER BY sort asc
      LIMIT ${limit}
      OFFSET ${offset}
      `;

    log("search", search);
    log("products", products.length);
    log("page", page);
    log("offset", offset);
    log("limit", limit);
    log("minPrice", minPrice);
    log("maxPrice", maxPrice);
    log("isFilter", isFilter);
    res.json({
      status: "success",
      message: "Products successfully retrieved",
      data: products,
    });
  } catch (err) {
    console.error("Error selecting products", err);
    res.status(500).json({ status: "error", message: "Unknown error occured" });
  }
});

//get itemid by site
app.get("/itemIds/:site", async (req, res) => {
  try {
    const itemIds = (
      await sql`
      SELECT itemId
      FROM ${sql(table)}
      WHERE site=${req.params.site}`
    ).map((item) => Number(item.itemid));

    log("itemIds", itemIds);

    res.json({
      status: "success",
      message: "Item id successfully selected",
      data: itemIds,
    });
  } catch (err) {
    console.error("Error selecting itemIds", JSON.stringify(req.params), err);
    res.status(500).send({ status: "error", message: "Unknown error occured" });
  }
});

//get product by ids
app.get("/productIds/:ids?", async (req, res) => {
  try {
    const paramIds = req.params?.ids || "";
    log("paramIds", paramIds);
    if (!paramIds || paramIds === "null") {
      return res.json({
        status: "success",
        message: "No products found",
        data: [],
      });
    }
    const ids = paramIds.split(",");
    const products = await sql`
      SELECT
        productTable.*,
        comparisonProductTable.id as c_id,
        comparisonProductTable.site as c_site,
        comparisonProductTable.name as c_name,
        comparisonProductTable.itemid as c_itemid,
        comparisonProductTable.shopid as c_shopid,
        comparisonProductTable.brand as c_brand,
        comparisonProductTable.rating as c_rating,
        comparisonProductTable.sold as c_sold,
        comparisonProductTable.price as c_price,
        comparisonProductTable.review as c_review,
        comparisonProductTable.stock as c_stock,
        comparisonProductTable.location as c_location,
        comparisonProductTable.image as c_image,
        comparisonProductTable.images as c_images,
        comparisonProductTable.url as c_url
      FROM ${sql(table)} productTable
      LEFT JOIN ${sql(table)} comparisonProductTable
      ON productTable.comparisonid = comparisonProductTable.id
      WHERE productTable.id IN ${sql(ids)}`;
    // log("products", products);

    res.json({
      status: "success",
      message: "Item id successfully selected",
      data: products,
    });
  } catch (err) {
    console.error("Error selecting itemIds", JSON.stringify(req.params), err);
    res.status(500).send({ status: "error", message: "Unknown error occured" });
  }
});

app.get("/search/defaultValues", async (req, res) => {
  try {
    const [data] = await sql`
      SELECT
       	MIN(price) as minPrice,
       	MAX(price) as maxPrice
      FROM ${sql(table)};
      `;

    log("data", data);

    const minPrice = 0;
    const maxPrice = data.maxprice
      ? roundToNearestWholeNumber(data.maxprice)
      : 100000;
    const step = 10;

    res.json({
      status: "success",
      message: "Default values successfully selected",
      data: {
        minPrice,
        maxPrice,
        step,
      },
    });
  } catch (err) {
    console.error("Error selecting search default values", err);
    res.status(500).send({ status: "error", message: "Unknown error occured" });
  }
});

//batch create
app.post("/products/batch", async (req, res) => {
  const reqBody = req.body;
  const products = reqBody.map((product) => {
    return {
      ...getNeededData(product),
      createdat: sql`now()`,
    };
  });
  log("products", products);

  let lookupItemIds = [],
    site;
  for (const product of products) {
    site = product.site;
    lookupItemIds.push(product.itemid);
  }

  const existingItemIds = (
    await sql`
    SELECT itemid
    FROM ${sql(table)}
    WHERE site=${site}
    AND itemid IN ${sql(lookupItemIds)}`
  ).map((item) => Number(item.itemid));

  const productsToInsert = products.filter(
    (product) => !existingItemIds.includes(Number(product.itemid)),
  );

  const productsArr = await sql`
    INSERT INTO ${sql(table)}
    ${sql(productsToInsert)}
    returning itemid
  `;

  log("productsArr", productsArr);

  res.status(201).json({
    status: "success",
    message: "Products successfully created",
    data: {
      itemIds: productsArr.map((product) => product.itemid),
    },
  });
});

//create
app.post("/products", async (req, res) => {
  const productData = {
    ...getNeededData(req.body),
    createdat: sql`now()`,
  };

  log("productData", productData);

  try {
    const [existingProduct] = await sql`
      SELECT *
      FROM ${sql(table)}
      WHERE site=${productData.site}
      AND itemid=${productData.itemid}`;

    if (existingProduct) {
      res.status(409).json({
        status: "success",
        message: "Product exist",
        data: existingProduct,
      });
      return;
    }

    const [product] = await sql`
      INSERT INTO ${sql(table)}
      ${sql(productData)}
      returning *
    `;

    res.status(201).json({
      status: "success",
      message: "Product successfully created",
      data: product,
    });
  } catch (err) {
    console.error("Error inserting product", JSON.stringify(req.body), err);
    res.status(500).send({ status: "error", message: "Unknown error occured" });
  }
});

//update
app.put("/products/:id", async (req, res) => {
  res.send("debug...");
});

// patch sort
app.patch("/products/sort", async (req, res) => {
  try {
    const [status] = await sql`
      SELECT *
      FROM ${sql(tableConfig)}
      WHERE "key"='sortStatus'`;

    if (!status) {
      console.error("Unable to see sortStatus config");
      res
        .status(500)
        .json({ status: "error", message: "Unknown error occured" });
      return;
    }

    if (status.value === "pending") {
      console.error("Currently updating products sort");
      res
        .status(500)
        .json({ status: "error", message: "Currently updating products sort" });
      return;
    }

    await sql`
            UPDATE ${sql(tableConfig)}
            SET value='pending'
            WHERE "key"='sortStatus'`;

    const lazadaProductIdsArr = await sql`
      SELECT id
      FROM ${sql(table)}
      WHERE site='lazada'
      AND sort IS NULL
      ORDER BY id ASC`;
    // log("lazadaProductIdsArr", lazadaProductIdsArr);

    const shopeeProductIdsArr = await sql`
      SELECT id
      FROM ${sql(table)}
      WHERE site='shopee'
      AND sort IS NULL
      ORDER BY id ASC`;
    // log("shopeeProductIdsArr", shopeeProductIdsArr);

    let lazadaProductIds, shopeeProductIds;
    if (lazadaProductIdsArr.length > shopeeProductIdsArr.length) {
      shopeeProductIds = shopeeProductIdsArr;
      lazadaProductIds = slice(
        0,
        shopeeProductIdsArr.length,
        lazadaProductIdsArr,
      );
    } else {
      lazadaProductIds = lazadaProductIdsArr;
      shopeeProductIds = slice(
        0,
        lazadaProductIdsArr.length,
        shopeeProductIdsArr,
      );
    }
    log("shopeeProductIds", shopeeProductIds, shopeeProductIds.length);
    log("lazadaProductIds", lazadaProductIds, lazadaProductIds.length);

    if (shopeeProductIds.length === 0 && lazadaProductIds.length === 0) {
      await sql`
              UPDATE ${sql(tableConfig)}
              SET value='free'
              WHERE "key"='sortStatus'`;

      res.json({ status: "success", message: "No product updated" });
      return;
    }

    const zipProductIds = flatten(zip(shopeeProductIds, lazadaProductIds));
    log("zipProductIds", zipProductIds);

    for (const product of zipProductIds) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      await sql`
        UPDATE ${sql(table)}
        SET sort=${sql`now()`}
        WHERE id=${product.id}`;
    }

    await sql`
            UPDATE ${sql(tableConfig)}
            SET value='free'
            WHERE "key"='sortStatus'`;

    res.json({ status: "success", message: "Products successfully updated" });
  } catch (err) {
    console.error("Error updating products sort", err);
    res.status(500).json({ status: "error", message: "Unknown error occured" });
  }
});

// patch url
app.patch("/products/url", async (req, res) => {
  try {
    const emptyURLProducts = await sql`
      SELECT *
      FROM ${sql(table)}
      WHERE url='' OR url IS NULL`;
    log("emptyURLProducts", emptyURLProducts);

    const updateData = [];
    for (const product of emptyURLProducts) {
      updateData.push([product.id, getProductUrl(product)]);
    }
    log("updateData", updateData);

    if (updateData.length) {
      await sql`
        UPDATE comparison SET url=update_data.url
          FROM (values ${sql(updateData)}) as update_data(id, url)
          WHERE comparison.id=(update_data.id)::int
      `;
      res.json({ status: "success", message: "Products successfully updated" });
      return;
    }

    res.json({ status: "success", message: "No product updated" });
  } catch (err) {
    console.error("Error updating products url", err);
    res.status(500).json({ status: "error", message: "Unknown error occured" });
  }
});

//update specific column
app.patch("/products/:id", async (req, res) => {
  res.send("debug...");
});

//batch delete
app.delete("/products/batch", async (req, res) => {
  if (!req.body.itemIds || !req.body.site) {
    return res
      .status(404)
      .send({ status: "error", message: "Products not found" });
  }

  try {
    const deletedProducts = await sql`
      DELETE
      FROM ${sql(table)}
      WHERE
        site=${req.body.site}
      AND
        itemid IN ${sql(req.body.itemIds)}
      returning itemid
    `;

    log("deletedProducts", deletedProducts);

    res.status(205).send();
  } catch (err) {
    console.error("Error deleting product", JSON.stringify(req.params), err);
    res.status(500).json({ status: "error", message: "Unknown error occured" });
  }
});

//delete
app.delete("/products/:itemId/:site", async (req, res) => {
  if (!req.params.itemId || !req.params.site) {
    return res
      .status(404)
      .send({ status: "error", message: "Product not found" });
  }

  try {
    const productArr = await sql`
      SELECT
        id
      FROM ${sql(table)}
      WHERE
        site=${req.params.site}
      AND
        itemid=${req.params.itemId}`;

    log("productArr", productArr);

    if (!productArr.length) {
      return res
        .status(404)
        .send({ status: "error", message: "Product not found" });
    }

    const product = productArr.shift();

    await sql`
      DELETE
      FROM ${sql(table)}
      WHERE id=${product.id}
      returning itemid`;

    res.status(205).send();
  } catch (err) {
    console.error("Error deleting product", JSON.stringify(req.params), err);
    res.status(500).json({ status: "error", message: "Unknown error occured" });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
