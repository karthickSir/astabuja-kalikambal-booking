export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "POST முறை மட்டும் அனுமதிக்கப்படுகிறது."
    });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return res.status(500).json({
      success: false,
      message: "சர்வர் அமைப்புகள் இன்னும் முடிக்கப்படவில்லை."
    });
  }

  try {
    const { name, town, phone, date } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof town !== "string" ||
      typeof phone !== "string" ||
      typeof date !== "string" ||
      !name.trim() ||
      !town.trim() ||
      !/^[0-9]{10}$/.test(phone) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        success: false,
        message: "அனைத்து விவரங்களையும் சரியாக நிரப்பவும்."
      });
    }

    const selectedDate = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "சரியான தேதியைத் தேர்ந்தெடுக்கவும்."
      });
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    });

    if (date < today) {
      return res.status(400).json({
        success: false,
        message: "கடந்த தேதியைத் தேர்ந்தெடுக்க முடியாது."
      });
    }

    const response = await fetch(
      `${url}/rest/v1/rpc/create_booking`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          p_booking_date: date,
          p_full_name: name.trim(),
          p_town: town.trim(),
          p_phone: phone
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Booking failed:", response.status, data);
      return res.status(400).json({
        success: false,
        message: "முன்பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
      });
    }

    const booking = Array.isArray(data) ? data[0] : data;

    if (!booking || !booking.token_number) {
      return res.status(500).json({
        success: false,
        message: "Token உருவாக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்."
      });
    }

    return res.status(200).json({
      success: true,
      booking: {
        token: String(booking.token_number).padStart(3, "0"),
        name: booking.full_name,
        town: booking.town,
        phone: booking.phone,
        date: booking.booking_date
      }
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({
      success: false,
      message: "தற்காலிகப் பிழை. சிறிது நேரம் கழித்து முயற்சிக்கவும்."
    });
  }
}
