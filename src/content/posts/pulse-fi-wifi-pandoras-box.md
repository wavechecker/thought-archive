---
title: "Your Router Can Read Your Pulse: The 23andMe Problem, All Over Again"
description: "Pulse-Fi proves WiFi can measure heart rate without wearables. But who owns your heartbeat data?"
publishDate: "2025-09-06"
tags: ["opinion", "analysis", "ai", "healthtech", "privacy"]
draft: false
related:
  - /guides/heart-rate-monitoring
---

## Hook
What if your WiFi router knew your heartbeat—and someone else owned that data?

## Context
Researchers at UC Santa Cruz have unveiled *Pulse-Fi*, a system that uses cheap WiFi chips (ESP32s, Raspberry Pis) to measure heart rate with clinical-level accuracy.  
No wearables, no straps, no wires—just radio waves bouncing around the room. In trials with 118 volunteers across 17 body positions, Pulse-Fi nailed accuracy to within **half a beat per minute** after just five seconds, even from three meters away.  

It’s an elegant proof-of-concept. A few years from now, your living room router could double as a health monitor. And that’s where the problems begin.

## The Pandora’s Box
On the surface, this is liberating. No batteries to charge. No $300 smartwatch required. Vital signs could be measured passively, opening the door for continuous health tracking in low-resource settings.  

But step back. What happens when data leaves your body? That’s where ownership flips.  

- **You produce the signal.**  
- **The device records the signal.**  
- **The company that owns the device or app owns the dataset.**  

That’s not just semantics. It’s a transfer of custody—and in today’s legal frameworks, once your vitals sit on someone else’s servers, *they* hold the rights to use, monetize, or sell it.  

## The 23andMe Parallel
Remember when 23andMe promised not to sell your DNA data? It wasn’t “sold”—until they partnered with pharma companies, and later when lawsuits and corporate struggles cast doubt on who really controlled that treasure trove of genomes.  

The darker scenario: bankruptcy. If a company folds, its “intellectual property” often gets sold off to creditors. And yes—your DNA sequences, or in the future your biometric signatures, can be treated as IP.  

You can change a password. You can’t change your genome. And you can’t change your heartbeat.  

Pulse-Fi is exciting science—but it opens a door we may not be able to close.

## Ownership vs. Consent
Wearables like Apple Watch or Samsung Health already collect biometric data, but at least you know when you’re opting in. WiFi-based monitoring is invisible. You may not even realize it’s happening.  

- **Consent becomes murky.** How do you know when you’re being measured?  
- **Data governance lags.** Who ensures the data stays on-device?  
- **Bystander risk is real.** In a crowded office or café, whose heartbeats are being logged?  

This isn’t just a technical question—it’s an ethical one. In the absence of strong regulation, ownership defaults to whoever captures the data first.

## Implications
- **Healthcare access:** Passive, low-cost vitals could help in homes and clinics with few resources.  
- **Surveillance creep:** Employers, insurers, even landlords could exploit these signals.  
- **Legal vacuum:** WiFi telemetry isn’t covered under HIPAA, GDPR, or most health privacy rules today.  
- **Future abuse:** Data sets of biometric “signatures” could outlive the people who produced them, with no way to revoke or delete.  

Like every new health sensing technology, Pulse-Fi is a double-edged sword.  

## FAQ
**Q: Could my home router really track me like this?**  
A: Not yet, but technically yes. Pulse-Fi showed it works on cheap chips—commercial routers would only improve accuracy.  

**Q: Isn’t this just hype?**  
A: It’s still at research stage (IEEE DCOSS-IoT 2025), but the accuracy results are real. The hype risk isn’t the science—it’s how fast companies will try to commercialize it.  

**Q: What’s the main danger?**  
A: Invisible data capture. Once your vitals are logged on someone else’s hardware, they may legally own them.  

## Further Reading
- [UC Santa Cruz news release on Pulse-Fi — accurate, low-cost heart-rate from Wi-Fi]:contentReference[oaicite:3]{index=3}  
- [IEEE DCOSS-IoT 2025 short paper — Pulse-Fi’s CSI + LSTM methodology]:contentReference[oaicite:4]{index=4}  
- [23andMe’s data fate — bankruptcy, transfer of genetic data, and user privacy risks]:contentReference[oaicite:5]{index=5}  


## Closing
We’ve seen this story before: seductive health insights now, hard privacy lessons later.  
Pulse-Fi shows your heartbeat can travel over WiFi. The real question is—who gets to listen?
