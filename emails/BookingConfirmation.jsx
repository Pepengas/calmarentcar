import React from 'react';
import { Html } from '@react-email/html';
import { Head } from '@react-email/head';
import { Preview } from '@react-email/preview';

export default function BookingConfirmation({ data }) {
  return (
    <Html>
      <Head />
      <Preview>Your Calma Car Rental booking confirmation</Preview>
      <body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', padding: '40px 0' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <tr>
            <td style={{ backgroundColor: '#4b125c', padding: '20px', textAlign: 'center' }}>
              <img src="https://calmarental.com/images/CalmaLogo.jpg" alt="Calma Logo" title="Calma logo" style={{ maxWidth: '160px' }} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '30px 20px' }}>
              <h2 style={{ color: '#4b125c' }}>Booking Confirmation</h2>
              <p><strong>Reference:</strong> {data.reference}</p>
              <p><strong>Car:</strong> {data.car}</p>
              <p><strong>Pickup Date:</strong> {data.pickup}</p>
              <p><strong>Return Date:</strong> {data.return}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
              <p><strong>Add-ons:</strong> {data.addons}</p>
              <p><strong>Total Price (with add-ons):</strong> €{data.total}</p>
              <p><strong>Paid Amount (45%):</strong> €{data.paid}</p>
              <p><strong>Remaining Balance (55%):</strong> €{data.due}</p>
            </td>
          </tr>
          <tr>
            <td style={{ backgroundColor: '#f4f4f4', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
              Thank you for choosing Calma Car Rental. Safe travels!
            </td>
          </tr>
        </table>
      </body>
    </Html>
  );
}
