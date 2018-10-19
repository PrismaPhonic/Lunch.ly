/** Routes for Lunchly */

const express = require("express");
const { Customer, Reservation } = require("./models");

router = express.Router();


/** Homepage: show list of customers. */

router.get("/", async (req, res) => {
  const customers = await Customer.all();
  console.log(customers);
  res.render("customer_list.html", { customers })
});

router.post("/", async (req, res) => {
  let search = req.body.search;
  const customers = await Customer.customerSearch(search);
  res.render("customer_list.html", { customers })
});

/** Top 10 customers route */

router.get("/top-ten", async (req, res) => {
  const customers = await Customer.topTenReservationHolders();
  console.log(customers);
  res.render("topten_customers.html", { customers })
});

/** Form to add a new customer. */

router.get("/add/", async (req, res) => {
  res.render("customer_new_form.html");
});


/** Handle adding a new customer. */

router.post("/add/", async (req, res) => {
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const middleName = req.body.middleName || undefined;
    const phone = req.body.phone;
    const notes = req.body.notes;

    const customer = new Customer({ firstName, middleName, lastName, phone, notes });
    await customer.save()

    return res.redirect(`/${customer.id}/`);
  } catch (e) {
    return res.status(500).send(`Can't add customer: ${e}`);
  }
});


/** Show a customer, given their ID. */

router.get("/:customerId/", async (req, res) => {
  try {
    const customer = await Customer.get(req.params.customerId);
    const reservations = await customer.getReservations();
    return res.render("customer_detail.html", { customer, reservations })
  } catch (e) {
    return res.status(500).send(`Can't get customer: ${e}`);
  }
});


/** Show form to edit a customer. */

router.get("/:customerId/edit/", async (req, res) => {
  try {
    const customer = await Customer.get(req.params.customerId);
    res.render("customer_edit_form.html", { customer });
  } catch (e) {
    return res.status(500).send(`Can't get customer: ${e}`);
  }
});


/** Handle editing a customer. */

router.post("/:customerId/edit/", async (req, res) => {
  try {
    const customer = await Customer.get(req.params.customerId);

    customer.firstName = req.body.firstName;
    customer.lastName = req.body.lastName;
    customer._phone = req.body.phone;
    customer._notes = req.body.notes;
    console.log(customer);

    await customer.save();
    return res.redirect(`/${customer.id}/`);
  } catch (e) {
    return res.status(500).send(`Can't edit customer: ${e}`);
  }
});


/** Handle adding a new reservation. */

router.post("/:customerId/add-reservation/", async (req, res) => {
  const customerId = req.params.customerId;
  const startAt = new Date(req.body.startAt);
  const numGuests = req.body.numGuests;
  const notes = req.body.notes;

  try {
    const reservation = new Reservation({ customerId, startAt, numGuests, notes });
    reservation.save();

    return res.redirect(`/${customerId}/`);
  } catch (e) {
    res.status(e.status || 500);
    return res.json({ error: `${e}` });
  }
});


/** Show form to edit a reservation. */

router.get("/reservations/:reservationId/edit/", async (req, res) => {
  try {
    const reservation = await Reservation.get(req.params.reservationId);
    res.render("reservation_edit_form.html", { reservation });
  } catch (e) {
    return res.status(500).send(`Can't get reservation: ${e}`);
  }
});


/** Handle editing a reservation. */

router.post("/reservations/:reservationId/edit/", async (req, res) => {
  try {
    const reservation = await Reservation.get(req.params.reservationId);

    reservation.startAt = req.body.startAt;
    reservation.numGuests = req.body.numGuests;
    reservation.notes = req.body.notes;

    await reservation.save();
    return res.redirect(`reservations/${reservation.id}/`);
  } catch (e) {
    return res.status(500).send(`Can't edit customer: ${e}`);
  }
});


module.exports = router;