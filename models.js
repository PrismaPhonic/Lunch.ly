/** Models for Lunchly */

const pg = require("pg");
const moment = require("moment");

const db = new pg.Client("postgresql://localhost/lunchly");
db.connect();


/** A reservation for a party */

class Reservation {
  constructor({ id, customerId, numGuests, startAt, notes }) {
    this.id = id;
    this.customerId = customerId;
    this.numGuests = numGuests;
    this.startAt = startAt;
    this.notes = notes;
  }

  /** methods for setting/getting startAt time */

  set startAt(val) {
    if (val instanceof Date && !isNaN(val)) this._startAt = val;
    else throw new Error("Not a valid startAt.");
  }

  get startAt() {
    return this._startAt;
  }

  get formattedStartAt() {
    return moment(this.startAt).format('MMMM Do YYYY, h:mm a');
  }

  /** methods for setting/getting notes (keep as a blank string, not NULL) */

  set notes(val) {
    this._notes = val || '';
  }

  get notes() {
    return this._notes;
  }

  /** numGuests setter/getter pattern */

  set numGuests(val) {
    if (val < 1) {
      let err = new Error('Must have at least 1 in your party to make a reservation');
      err.status = 422;
      throw err;
    } else if (isNaN(val)) {
      let err = new Error('Number of guests must be a valid number');
      err.status = 400;
      throw err;
    }
    this._numGuests = val;
  }

  get numGuests() {
    return this._numGuests;
  }

  /** methods for setting/getting customer ID: can only set once. */

  set customerId(val) {
    if (this._customerId && this._customerId !== val)
      throw new Error('Cannot change customer ID');
    this._customerId = val;
  }

  get customerId() {
    return this._customerId;
  }

  /** given a customer id, find their reservations. */

  static async getReservationsForCustomer(customerId) {
    const results = await db.query(
      `SELECT id, 
           customer_id AS "customerId", 
           num_guests AS "numGuests", 
           start_at AS "startAt", 
           notes AS "notes"
         FROM reservations 
         WHERE customer_id = $1`,
      [customerId]
    );

    return results.rows.map(row => new Reservation(row));
  }

  /** find a reservation by id. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
           customer_id AS "customerId", 
           num_guests AS "numGuests", 
           start_at AS "startAt",
           notes
         FROM reservations 
         WHERE id = $1;`,
      [id]
    );
    return new Reservation(results.rows[0]);
  }

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO reservations (customer_id, num_guests, start_at, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.customerId, this.numGuests, this.startAt, this.notes]);
      console.log("result", result.rows[0].id);
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE reservations SET customer_id=$1, num_guests=$2, start_at=$3, notes=$4
             WHERE id=$5`,
        [this.customer_id, this.numGuests, this.startAt, this.notes, this.id]);
    }
  }
}


/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, middleName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** methods for getting/setting notes (keep as empty string, not NULL) */

  set notes(val) {
    this._notes = val || '';
  }

  get notes() {
    return this._notes;
  }

  /** methods for getting/setting phone #. */

  set phone(val) {
    this._phone = val || null;
  }

  get phone() {
    return this._phone;
  }


  /** methods for getting/setting first and last name
   *  so they are stored lowercase in our db
   */

  set firstName(str) {
    this._firstName = str.toLowerCase();
  }

  get firstName() {
    return this._firstName.replace(/\w/, c => c.toUpperCase());
  }

  set middleName(str) {
    if (str) {
      this._middleName = str.toLowerCase();
    }
  }

  get middleName() {
    if (this._middleName) {
      return this._middleName.replace(/\w/, c => c.toUpperCase());
    }
  }

  set lastName(str) {
    this._lastName = str.toLowerCase();
  }

  get lastName() {
    return this._lastName.replace(/\w/, c => c.toUpperCase());
  }

  /** methods for getting/setting full name. */

  get fullName() {
    if (this.middleName) {
      return `${this.firstName} ${this.middleName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",
         middle_name AS "middleName", 
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** filter all customers by a search */

  static async customerSearch(search) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",
         middle_name AS "middleName",
         last_name AS "lastName"
       FROM customers
       WHERE first_name ILIKE $1 OR last_name ILIKE $1
       ORDER BY last_name, first_name`,
      [`${search}%`]
    );
    return results.rows.map(c => new Customer(c));
  }

  /** Return top 10 customers by reservation count */


  static async topTenReservationHolders() {
    const results = await db.query(
      `SELECT customers.id, 
           customers.first_name AS "firstName",
           customers.middle_name AS "middleName", 
           customers.last_name AS "lastName",
           count(*)
         FROM customers
         JOIN reservations ON customers.id = reservations.customer_id
         GROUP BY customers.id
         ORDER BY count desc
         LIMIT 10;
      `
    );

    results.rows.forEach((r, i) => {
      delete r.count;
      results.rows[i] = new Customer(r);
    })

    return results.rows;
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",
         middle_name AS "middleName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );
    return new Customer(results.rows[0]);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, middle_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.middleName, this.lastName, this.phone, this.notes]);
      console.log("result", result.rows[0].id);
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, middle_name=$2, last_name=$3, phone=$4, notes=$5
             WHERE id=$6`,
        [this.firstName, this.middleName, this.lastName, this.phone, this.notes, this.id]);
    }
  }
}


module.exports = { Customer, Reservation };
