# Panchang Clock

A Hindu Panchang watchface for Bangle.js 2.

## Features

- Large, easy-to-read time display
- Current date with ordinal suffix (13th, 21st, etc.)
- Hindu masa (month) name
- Current tithi with paksha and nature in compact format (e.g., K9(Rkt))
- Countdown to next Ekadashi in a colorful box
- Daily Vishnu Sahasranama name
- Battery percentage and step count
- Vibration alerts every 30 minutes and on the hour

## Display Format

- **Top**: Battery % | Steps
- **Masa**: Hindu month name (orange)
- **Time**: HH:MM (large, saffron color)
- **Date**: "13th Dec" (white)
- **Tithi**: Format like "K9(Rkt)" meaning Krishna Paksha, Navami, Rikta nature
  - S = Shukla Paksha, K = Krishna Paksha
  - Number = Tithi (1-15)
  - (Nan/Bhd/Jay/Rkt/Prn) = Nature
- **Ekadashi**: Days until next Ekadashi in colored box
- **Vishnu**: Name of the day from Vishnu Sahasranama (golden)

## Tithi Nature

- **Nan** (Nanda): Joyful
- **Bhd** (Bhadra): Auspicious
- **Jay** (Jaya): Victorious
- **Rkt** (Rikta): Empty
- **Prn** (Purna): Complete

## Battery Optimization

- Screen turns off after 5 seconds
- Updates time every 60 seconds
- Auto-updates tithi only when it changes
- No continuous sensor usage
- Wake on wrist twist
- Expected battery life: 3-5 days

## Data Coverage

- December 2025 with accurate timings for Hyderabad
- Full year 2026 with calculated daily tithi
- 100 Vishnu Sahasranama names (cycles daily)

## Usage

- Shake/twist wrist to wake screen
- Wait 5 seconds for auto screen-off
- Press BTN1 to exit to launcher
- Vibrates every hour and half-hour

## Credits

- Panchang data from Drik Panchang (drikpanchang.com)
- Vishnu Sahasranama from traditional sources
- Location: Hyderabad, Telangana, India

Jai Shri Vishnu! 🙏
