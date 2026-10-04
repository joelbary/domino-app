-- Store phone numbers in international format (+country code).
UPDATE "players" SET "phone" = CASE
  WHEN "phone" LIKE '+%' THEN "phone"
  WHEN length("phone") = 10 THEN '+1' || "phone"
  ELSE '+' || "phone"
END;
