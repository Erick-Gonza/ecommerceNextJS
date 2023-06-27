"use strict";

const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

function calcDisccountPrice(price, discount) {
  if (!discount) return price;
  const disccountAmount = (price * discount) / 100;
  const result = price - disccountAmount;
  return result.toFixed(2);
}

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async paymentOrder(ctx) {
    const { token, products, idUser, addressShipping } = ctx.request.body;

    // Calculate total payment
    let totalPayment = 0;
    products.forEach((product) => {
      const priceTemp = calcDisccountPrice(
        product.attributes.price,
        product.attributes.discount
      );
      totalPayment += Number(priceTemp) * product.quantity;
    });

    // Create charge on stripe
    const charge = await stripe.charges.create({
      amount: Math.round(totalPayment * 100),
      currency: "mxn",
      source: token.id,
      description: `ID Usuario: ${idUser}`,
    });

    // Create order to store on db
    const data = {
      user: idUser,
      totalPayment,
      products,
      idPayment: charge.id,
      addressShipping,
    };

    // Validate data
    const model = strapi.contentTypes["api::order.order"];
    const validData = await strapi.entityValidator.validateEntityCreation(
      model,
      data
    );

    // Save data on db
    const entry = await strapi.db
      .query("api::order.order")
      .create({ data: validData });

    //return to client
    return entry;
  },
}));
