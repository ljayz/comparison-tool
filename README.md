APIs

| File   | Method | Routing                 | Middlewares | FilePath         |
| ------ | ------ | ----------------------- | ----------- | ---------------- |
| app.js |        |                         |             |                  |
|        | get    | /                       |             | app.js#L82-L84   |
|        | get    | /about                  |             | app.js#L86-L93   |
|        | get    | /tampermonkey           |             | app.js#L95-L111  |
|        | get    | /products               |             | app.js#L114-L181 |
|        | get    | /itemIds/:site          |             | app.js#L184-L204 |
|        | get    | /productIds/:ids?       |             | app.js#L207-L252 |
|        | get    | /search/defaultValues   |             | app.js#L254-L284 |
|        | post   | /products/batch         |             | app.js#L287-L331 |
|        | post   | /products               |             | app.js#L334-L373 |
|        | delete | /products/batch         |             | app.js#L515-L540 |
|        | delete | /products/:itemId/:site |             | app.js#L543-L581 |
|        | put    | /products/:id           |             | app.js#L376-L378 |

```
get     /about - returns about data
get     /tampermonkey - returns code for installing script in tampermonkey
get     /products - returns list of products in mobile app home page
get     /itemIds/:site - returns lists of itemid stored in the database
get     /productsIds/:ids? - return lists of productids stored in the database. if ids has a value filter result based on value of ids
get     /search/defaultValues - return lists of min and maximum value used in mobile app filtering
post    /products/batch - save product by batch, used in tampermonkey
pos     /products - save one product, used in tampermonkey
delete  /products/batch - delete product by batch, used in tampermonkey
delete  /products/:itemId/:site - delete one product, used in tampermonkey
put     /products/:id - update products, used in tooljet to update product comparison
```
