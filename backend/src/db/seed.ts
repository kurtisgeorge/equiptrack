import Database from "better-sqlite3"
import { readFileSync } from "fs"
import { join } from "path"
import { randomUUID, scryptSync, randomBytes } from "crypto"

function hashPasswordSync(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64) as Buffer
  return `${salt}:${hash.toString("hex")}`
}

const DEFAULT_PASSWORD_HASH = hashPasswordSync("demo123")

const dbPath = join(process.cwd(), "dev.db")
const db = new Database(dbPath)

const schemaSQL = readFileSync(join(__dirname, "schema.sql"), "utf-8")
db.exec(schemaSQL)

function generateId(): string {
  return randomUUID()
}

const categories = [
  { name: "Earthmoving", code: "EARTH" },
  { name: "Mining", code: "MINING" },
  { name: "Lifting", code: "LIFT" },
  { name: "Hauling", code: "HAUL" },
  { name: "Drilling", code: "DRILL" },
  { name: "Concrete", code: "CONCRETE" },
  { name: "Compaction", code: "COMPACT" },
  { name: "Pipeline", code: "PIPE" },
  { name: "Oilfield", code: "OILFIELD" },
  { name: "Power", code: "POWER" },
  { name: "Plant", code: "PLANT" },
  { name: "Rail", code: "RAIL" },
  { name: "Tunneling", code: "TUNNEL" },
  { name: "Safety", code: "SAFETY" },
  { name: "Site Support", code: "SUPPORT" },
]

const locations = [
  { name: "Fort McMurray Yard", code: "YMM-YARD", region: "Alberta" },
  { name: "Cold Lake Operations", code: "CL-OPS", region: "Alberta" },
  { name: "Grande Prairie Field Base", code: "GP-FIELD", region: "Alberta" },
  { name: "Edmonton Maintenance Hub", code: "YEG-MAINT", region: "Alberta" },
  { name: "Red Deer Logistics Yard", code: "RD-LOG", region: "Alberta" },
  { name: "Saskatoon Project Staging", code: "YXE-STAGE", region: "Saskatchewan" },
  { name: "Northern Mine Site A", code: "MINE-A", region: "Northern Region" },
  { name: "Northern Mine Site B", code: "MINE-B", region: "Northern Region" },
  { name: "Refinery Turnaround Site", code: "REF-TAR", region: "Industrial Corridor" },
  { name: "Nuclear Plant Contractor Yard", code: "NUC-YARD", region: "Power Sector" },
]

const equipmentCatalog: [string, string][] = [
  ["Hydraulic Excavator", "EARTH"], ["Large Mining Excavator", "MINING"], ["Electric Rope Shovel", "MINING"],
  ["Dragline Excavator", "MINING"], ["Wheel Loader", "EARTH"], ["Large Wheel Loader", "MINING"],
  ["Track Loader", "EARTH"], ["Skid Steer Loader", "EARTH"], ["Compact Track Loader", "EARTH"],
  ["Motor Grader", "EARTH"], ["Articulated Dump Truck", "HAUL"], ["Rigid Frame Haul Truck", "MINING"],
  ["Off-Highway Dump Truck", "HAUL"], ["Underground Mining Truck", "MINING"], ["Water Truck", "SUPPORT"],
  ["Fuel Service Truck", "SUPPORT"], ["Lube Service Truck", "SUPPORT"], ["Boom Truck", "LIFT"],
  ["Rough Terrain Crane", "LIFT"], ["All Terrain Crane", "LIFT"], ["Crawler Crane", "LIFT"],
  ["Tower Crane", "LIFT"], ["Mobile Crane", "LIFT"], ["Telehandler", "LIFT"],
  ["Reach Forklift", "LIFT"], ["Heavy Lift Forklift", "LIFT"], ["Container Handler", "LIFT"],
  ["Side Loader Forklift", "LIFT"], ["Pipe Layer", "PIPE"], ["Bulldozer", "EARTH"],
  ["High Horsepower Dozer", "MINING"], ["Crawler Tractor", "EARTH"], ["Wheel Dozer", "EARTH"],
  ["Soil Compactor", "COMPACT"], ["Padfoot Compactor", "COMPACT"], ["Vibratory Smooth Drum Roller", "COMPACT"],
  ["Tandem Asphalt Roller", "COMPACT"], ["Pneumatic Tire Roller", "COMPACT"], ["Asphalt Paver", "EARTH"],
  ["Cold Planer", "EARTH"], ["Soil Stabilizer", "EARTH"], ["Trench Cutter", "PIPE"],
  ["Chain Trencher", "PIPE"], ["Wheel Trencher", "PIPE"], ["Rock Saw Trencher", "PIPE"],
  ["Horizontal Directional Drill", "DRILL"], ["Large Rotary Drill Rig", "DRILL"], ["Blast Hole Drill Rig", "MINING"],
  ["Surface Mining Drill", "MINING"], ["Core Drill Rig", "DRILL"], ["Diamond Core Drill", "DRILL"],
  ["Reverse Circulation Drill", "DRILL"], ["Auger Drill Rig", "DRILL"], ["Pile Driver", "EARTH"],
  ["Hydraulic Pile Hammer", "EARTH"], ["Vibro Hammer", "EARTH"], ["Drilling Jumbo", "MINING"],
  ["Bolting Jumbo", "MINING"], ["Underground Loader", "MINING"], ["Underground Scooptram", "MINING"],
  ["Underground Personnel Carrier", "MINING"], ["Underground Shotcrete Sprayer", "MINING"],
  ["Underground Scaler", "MINING"], ["Underground Utility Vehicle", "MINING"], ["Mine Service Truck", "MINING"],
  ["Explosives Charging Unit", "MINING"], ["Shotcrete Pump", "CONCRETE"], ["Concrete Boom Pump", "CONCRETE"],
  ["Line Concrete Pump", "CONCRETE"], ["Concrete Mixer Truck", "CONCRETE"], ["Volumetric Concrete Mixer", "CONCRETE"],
  ["Batch Plant", "CONCRETE"], ["Mobile Concrete Batch Plant", "CONCRETE"], ["Cement Bulk Trailer", "CONCRETE"],
  ["Grout Pump", "CONCRETE"], ["Grout Mixing Plant", "CONCRETE"], ["Slurry Pump Unit", "PLANT"],
  ["Dewatering Pump Skid", "PLANT"], ["High Capacity Water Pump", "PLANT"], ["Diesel Generator 500kW", "POWER"],
  ["Diesel Generator 1MW", "POWER"], ["Gas Turbine Generator", "POWER"], ["Portable Power Generator", "POWER"],
  ["Mobile Substation", "POWER"], ["Transformer Skid", "POWER"], ["Electrical Switchgear Container", "POWER"],
  ["Cable Reel Trailer", "POWER"], ["Cable Pulling Winch", "POWER"], ["Pipe Welding Rig", "PIPE"],
  ["Automatic Welding System", "PIPE"], ["Pipe Bending Machine", "PIPE"], ["Pipe Threading Machine", "PIPE"],
  ["Pipe Handling Crane", "PIPE"], ["Pipe Transport Trailer", "PIPE"], ["Pipe Coating Machine", "PIPE"],
  ["Hydrostatic Pressure Test Pump", "PIPE"], ["Sandblasting Unit", "PLANT"], ["Industrial Pressure Washer", "PLANT"],
  ["Hydro Excavation Truck", "SUPPORT"], ["Vacuum Truck", "SUPPORT"], ["Combination Sewer Truck", "SUPPORT"],
  ["Industrial Vacuum Excavator", "SUPPORT"], ["Sludge Removal Truck", "SUPPORT"], ["Tank Cleaning Unit", "PLANT"],
  ["Mobile Flare System", "OILFIELD"], ["Gas Compression Unit", "OILFIELD"], ["Gas Dehydration Unit", "OILFIELD"],
  ["Pumpjack", "OILFIELD"], ["Well Service Rig", "OILFIELD"], ["Coil Tubing Unit", "OILFIELD"],
  ["Wireline Unit", "OILFIELD"], ["Workover Rig", "OILFIELD"], ["Fracturing Pump Truck", "OILFIELD"],
  ["Fracturing Blender", "OILFIELD"], ["Sand Storage System", "OILFIELD"], ["Sand Conveyor System", "OILFIELD"],
  ["Fluid Storage Tank", "OILFIELD"], ["Mud Pump", "OILFIELD"], ["Drilling Mud System", "OILFIELD"],
  ["Drill Pipe Handler", "OILFIELD"], ["Pipe Rack System", "OILFIELD"], ["Top Drive Drilling System", "OILFIELD"],
  ["BOP Handling System", "OILFIELD"], ["Wind Turbine Installation Crane", "POWER"],
  ["Wind Turbine Blade Transporter", "POWER"], ["Wind Turbine Tower Transporter", "POWER"],
  ["Transformer Transport Trailer", "POWER"], ["Self-Propelled Modular Transporter", "HAUL"],
  ["Heavy Haul Tractor", "HAUL"], ["Multi-Axle Lowboy Trailer", "HAUL"], ["Hydraulic Platform Trailer", "HAUL"],
  ["Industrial Material Handler", "PLANT"], ["Scrap Handler Excavator", "PLANT"], ["Log Loader", "HAUL"],
  ["Rail Mounted Crane", "RAIL"], ["Rail Maintenance Grinder", "RAIL"], ["Ballast Regulator", "RAIL"],
  ["Rail Tamper", "RAIL"], ["Rail Track Excavator", "RAIL"], ["Tunnel Boring Machine", "TUNNEL"],
  ["Micro Tunnel Boring Machine", "TUNNEL"], ["Roadheader", "TUNNEL"], ["Shaft Sinking Rig", "TUNNEL"],
  ["Raise Boring Machine", "TUNNEL"], ["Slurry Shield TBM", "TUNNEL"], ["LNG Pump Skid", "PLANT"],
  ["Cryogenic Storage Tank", "PLANT"], ["Industrial Cooling Tower", "PLANT"], ["Industrial Air Compressor", "PLANT"],
  ["High Pressure Air Compressor", "PLANT"], ["Nitrogen Pumping Unit", "PLANT"], ["Oxygen Generation System", "PLANT"],
  ["Industrial Chiller", "PLANT"], ["Heat Exchanger Skid", "PLANT"], ["Chemical Injection Skid", "PLANT"],
  ["Catalyst Handling System", "PLANT"], ["Reactor Vessel Transporter", "PLANT"], ["Industrial Furnace", "PLANT"],
  ["Coke Drum Cutting System", "PLANT"], ["Slag Handling Machine", "PLANT"], ["Steel Mill Ladle Crane", "PLANT"],
  ["Continuous Casting Machine", "PLANT"], ["Rolling Mill Stand", "PLANT"], ["Billet Handling Crane", "PLANT"],
  ["Nuclear Fuel Handling Machine", "POWER"], ["Reactor Vessel Crane", "POWER"],
  ["Spent Fuel Cask Transporter", "POWER"], ["Radiation Shielded Transport Vehicle", "POWER"],
  ["Reactor Coolant Pump", "POWER"], ["Turbine Generator Set", "POWER"], ["Cooling Water Pump Station", "POWER"],
  ["High Voltage Circuit Breaker Unit", "POWER"], ["Grid Power Transformer", "POWER"],
  ["Cable Laying Machine", "POWER"], ["High Mast Lighting Tower", "SUPPORT"], ["Mobile Lighting Plant", "SUPPORT"],
  ["Industrial Fire Truck", "SAFETY"], ["Industrial Foam Suppression Unit", "SAFETY"],
  ["Hazmat Response Vehicle", "SAFETY"], ["Confined Space Rescue Unit", "SAFETY"],
  ["Site Ambulance Unit", "SAFETY"], ["Mobile Command Center", "SAFETY"],
  ["Remote Inspection Drone System", "SAFETY"], ["Industrial Survey Drone System", "SAFETY"],
]

const manufacturers = [
  "Caterpillar", "Komatsu", "Liebherr", "Hitachi", "Volvo", "John Deere", "Sandvik", "Epiroc",
  "Terex", "Sany", "XCMG", "Manitowoc", "Kalmar", "Atlas Copco", "National Oilwell Varco",
  "Schramm", "Boart Longyear", "Putzmeister", "Zoomlion", "Mammoet",
]

const departments = ["Operations", "Field Services", "Maintenance", "Turnaround", "Projects", "Logistics"]

const jobSites = [
  "North Pit Expansion", "Steam Plant Upgrade", "Tailings Cell 4", "Pipeline Spread 7",
  "Refinery Turnaround Unit 12", "Cooling Water Upgrade", "Crusher Relocation",
  "Substation Expansion", "Well Pad 14B", "Tank Farm Rehabilitation",
  "Overburden Removal Phase 3", "Secondary Recovery Program", "Camp Road Grading",
  "Compressor Station 6 Tie-In", "Settling Pond Dike Repair",
]

// ─── Rich note bodies (equipment unit, rental, maintenance, issue) ───────────

const equipmentNoteBodies = [
  "Operator reported a slight hydraulic pressure drop during boom extension — pressure recovers on idle. Flagged for next service window; no operational restriction in place at this time.",
  "Routine 250-hour inspection completed. Filters replaced, greasing points serviced, fluid levels topped up. No deficiencies noted. Unit cleared for continued deployment.",
  "Minor surface rust observed on the left side access ladder. Structural integrity not compromised. Recommend sandblasting and touch-up paint at next scheduled downtime.",
  "Track tension on the right side measured at the lower end of tolerance. Adjusted to spec during shift. Operator advised to monitor and report if slack returns before end of week.",
  "Cab HVAC blowing warm intermittently. Refrigerant charge appears low. Booked for HVAC service — operator comfort is affected in peak summer temperatures.",
  "Unit returned from North Pit after 18-day deployment. Full walkaround completed. All lights functional, no fluid leaks, undercarriage in acceptable condition. Cleared for redeployment.",
  "Windshield has a 15 cm crack originating from lower driver-side corner. Does not impair sightlines but is flagged per safety policy — replacement scheduled for end of week.",
  "Boom cylinder seal showing minor seepage at the rod end. Not a critical leak but will be monitored daily. Maintenance notified. Approximate repair window: next 72 hours.",
  "Engine hours at 4,820 — approaching 5,000-hour major overhaul threshold. Maintenance team alerted. Parts pre-order initiated for major service kit.",
  "Left rear tire on haul truck showing uneven wear pattern. Likely alignment or suspension issue. Pulled from service for inspection. Replacement tire fitted from yard stock.",
  "Electrical harness near cab base shows chafing against the frame. Potential intermittent fault risk. Secured with conduit clamp as a temporary measure. Full harness replacement ordered.",
  "Bucket teeth replaced — previous set was worn past 40% of original profile. New teeth fitted and torqued per manufacturer spec. Bucket lip also inspected for cracks — none found.",
  "Operator reported unusual noise from the final drive during reversing. Sound is intermittent and not reproducible at low speed. Maintenance to perform final drive oil sample analysis.",
  "Pre-shift check revealed low coolant level. Added 2 litres of approved coolant mix. No obvious external leak observed. Booked for pressure test to identify potential internal seepage.",
  "Unit has exceeded recommended deployment hours for this quarter. Scheduled downtime block allocated next Monday. Operator safety briefing updated with interim inspection intervals.",
  "Ground-engaging tools replaced per scheduled wear cycle. New bucket adapters installed. All pins and retainers checked — two retaining clips replaced. Good condition overall.",
  "Battery bank showing 11.8V at rest — below the 12.4V minimum spec. Jump-start required this morning. Batteries flagged for replacement before next deployment.",
  "Slew ring bearing grease purged and regreased following torque-check procedure. Bearing play measured within spec. No cracking or pitting observed on visual inspection.",
  "Fuel filter replaced ahead of schedule due to water contamination indicator light. Fuel tank drained and inspected — approximately 0.5L of water-contaminated fuel removed.",
  "Operator noted the auto-greasing system indicator light is on. Manual greasing applied as a precaution. Lubrication tech to inspect the pump assembly and reservoir level.",
  "Platform and handrails inspected following near-miss report from adjacent work area. All safety hardware confirmed secure. Anti-slip tread material in good condition.",
  "Radiator fins partially blocked with debris from tailings area operation. Fins blown out with compressed air — core flow now fully clear. Coolant temp has returned to normal range.",
  "Oil sample taken during scheduled PM. Lab results pending. Based on visual inspection, oil is dark but not metallic. Will defer oil change decision until sample results received.",
  "Air filter primary element replaced. Secondary element inspected — clean, retained. Restriction indicator reset. Engine intake system fully sealed and reinstated.",
  "Under-carriage inspection at 500 hours — sprocket wear measured at 18%, idler wear at 12%, track pads at 25% wear. All within acceptable limits. Next undercarriage check at 1,000 hours.",
]

const rentalNoteBodies = [
  "Admin confirmed equipment availability with yard staff before approving. Unit verified fuelled and ready for pickup at 06:30 dispatch window.",
  "Field supervisor requested early return — job scope reduced. Equipment checked back in 3 days ahead of schedule. No damage, all fluids at level.",
  "Rental extended by 4 days following site manager request — additional earthworks required on the eastern berm. Updated end date approved and logged.",
  "Equipment held at site overnight due to muddy access road preventing haul truck retrieval. Security measures in place. Retrieval rescheduled for morning.",
  "Operator noted fuel level was below 50% at pickup — fuelled on-site before mobilisation. Fuel cost to be cross-charged to project cost code PL-7B.",
  "Return inspection completed by yard foreman. Minor mud accumulation on undercarriage — washed down in yard. No damage or defects. Rental closed in good standing.",
  "Approved unit was unavailable at dispatch time due to a last-minute unscheduled repair. Alternate unit of same type provided — documented under this rental record.",
  "Requester confirmed operator certification on file for this equipment type prior to checkout. Cert number logged in HSE system.",
  "Late return flagged — equipment not returned by approved end date. Field supervisor contacted. Confirmed equipment still required for 2 additional days. Status updated to overdue pending formal extension.",
  "Pre-rental inspection conducted jointly by maintenance tech and requester. No pre-existing damage noted. All accessories and attachments confirmed present and functional.",
  "Site received unusually heavy rainfall during rental period. Equipment was relocated to higher ground. Hourly operation logs submitted by operator — no issues during wet conditions.",
  "Rental approved but equipment held pending resolution of outstanding safety recall notice. Recall verified as not applicable to this serial number. Equipment released following confirmation.",
]

const maintenanceNoteBodies = [
  "Found significant debris accumulation in the cooling air intake. Cleaned thoroughly. Recommend adding an intake screen guard — will source from supplier.",
  "Boom cylinder removed for bench inspection. Seals replaced with OEM kit. Cylinder honed and reassembled. Pressure tested to 3,500 PSI — no leaks. Reinstalled and function tested.",
  "Electrical diagnostic completed using CAT ET tool. Found fault code E360 — turbo inlet pressure sensor. Sensor replaced. Fault cleared and unit tested under load.",
  "Transmission oil sample from last service came back with elevated iron particles. Full transmission drain, inspection, and refill completed. No visible gear damage found.",
  "Scheduled 1,000-hour service completed: engine oil, all filters, coolant flush, battery load test, brake adjustment, track tension, and full fluid analysis kit submitted to lab.",
  "Welding repair completed on the right-hand dozer blade — stress crack running approximately 220mm. Crack vee'd out, welded in two passes, ground smooth, and MPI tested. No further cracking found.",
  "Hydraulic pump replaced following field report of loss of power. Old pump removed — internal vane wear observed. New pump installed, system flushed, and pressure tested. Performance restored.",
  "Air conditioning refrigerant recovered, system vacuumed, and recharged to manufacturer specification. Compressor clutch also replaced — slipping observed on inspection.",
  "Swing motor disassembled — found worn thrust washers. Parts on order from OEM. Temporary restriction placed on swing speed. Expected back in service within 5 business days.",
  "Final drive oil replaced on both sides at 3,000-hour interval. Left side showed slight metallic tinge — consistent with normal bedding wear. No abnormal findings. Cleared for deployment.",
  "Undercarriage replacement: both track chains replaced, sprockets replaced, idlers resurfaced, and new track shoes fitted. All torqued to spec. Full undercarriage warranty period reset.",
  "Engine overhaul completed. Pistons, rings, liners, main bearings, and con-rod bearings replaced. Valve seats re-cut. Engine run-in per factory procedure — 2-hour low-load break-in completed.",
  "Brake system inspected following operator concern. Brake pads measured at 4mm — above the 3mm replacement threshold. Calipers cleaned and lubricated. Brake fluid flushed.",
  "Investigated intermittent hydraulic fault. Root cause identified as a loose return filter housing — was bypassing under pressure. Tightened and sealed. Fault not reproducible after fix.",
  "Technician replaced main battery bank (3 × 12V 200Ah). Old batteries load-tested — all below 60% capacity. New batteries installed, terminals cleaned, and charge confirmed.",
]

const issueDescriptionBodies = [
  "Operator noticed a continuous drip from the hydraulic return line near the boom pivot during operation. Leak is approximately 1 drop every 3 seconds at full working pressure. Equipment pulled from service and marked with red tag. Location: boom pivot area, starboard side. First observed at approximately 10:45 this morning.",
  "Machine began vibrating excessively at the cab and operator station when operating above 1,800 RPM. Vibration is inconsistent — occurs mainly under load and reduces at idle. Suspect imbalance in the drive shaft or torque converter. Operator shut down immediately per procedure. This is the second report this month for this unit.",
  "Dashboard is showing a persistent E-450 electrical fault code. Unit loses cab display intermittently and the fault resets itself after 30–60 seconds. Issue began after the unit returned from the Pipeline Spread 7 site last Tuesday. No physical damage visible to the cab harness on initial inspection.",
  "Brake response is delayed by approximately 0.5–1 second on the left axle service brake. Noticed during a downhill approach to the crusher dump pocket. Operator felt the pedal travel was longer than usual. Unit parked and not returned to service. This is a safety-critical issue — please prioritise.",
  "Track wear on the left side is beyond the acceptable 30% threshold. Track shoe lug height measured at 18mm — spec minimum is 25mm. Pads are not providing adequate grip in soft ground. Unit sliding on grades during material push. Recommend immediate track replacement.",
  "Boom responds with a 1–2 second lag when joystick input is applied. Issue is consistent and not intermittent. Noticed during precision load placement at the steam plant. Operator could not accurately place loads. Suspect hydraulic pilot pressure issue or pilot valve sticking.",
  "Engine coolant temperature gauge spiking to 112°C under sustained heavy load — normal operating range is 82–95°C. Radiator core checked and is clean. Fan belt tension appears correct. Possible water pump impeller wear or thermostat sticking. Unit not returned to heavy operations until resolved.",
  "Cab instrumentation display goes blank for 2–5 seconds at random intervals. Occurs approximately every 15–20 minutes of operation. All gauges return to normal after each event. Suspect a loose connector behind the main instrument cluster or a failing display power regulator.",
  "Significant oil weeping from the main pump casing — not just seepage but active drips forming a pool on the parking pad. Oil is dark and smells burnt. Pump may be running hot. Estimated leak rate: 200–300 mL per hour. Unit removed from service. Fire risk flagged.",
  "Front left tyre has developed a slow puncture — pressure drops approximately 15 PSI per shift. Visual inspection reveals a screw embedded in the tread at approximately the 4 o'clock position. Tyre can be repaired if puncture is within repair zone. Request tyre repair or replacement.",
  "Slew ring makes a grinding sound during full left rotation. Right rotation is smooth and quiet. Issue started two days ago and is progressively getting louder. Greasing did not resolve the noise. Suspect debris embedded in the ring gear or damage to the ring teeth.",
  "Fuel is appearing in the coolant expansion tank — tan-coloured foam observed on the dipstick. Strong smell of diesel in the coolant. Likely head gasket failure or cracked cylinder head. Oil analysis will confirm. Unit isolated and coolant system drained to prevent further contamination.",
  "Operator reported a severe steering pull to the right when driving at speed. The machine drifts right requiring constant correction. Suspect a hydraulic cylinder imbalance or worn tie rod end on the right side. Steering system also appears to have excessive play at centre.",
  "Cab door hinge has sheared on the driver side — door only held by the lower hinge. Door cannot be closed securely. Safety risk if door swings open during operation. Operator using seat belt but door latch is non-functional. Hinge replacement required before unit re-enters service.",
  "Water pump is making a high-pitched squealing noise at startup that reduces after 5–10 minutes of warm-up. Bearing noise is getting progressively worse over the last three shifts. Coolant level is stable — no leaking externally. Pre-failure bearing symptoms. Replacement scheduled.",
]

const issueTitles = [
  "Hydraulic return line leak — boom pivot area",
  "Excessive cab and drive train vibration above 1,800 RPM",
  "Persistent E-450 electrical fault code — cab display resetting",
  "Left axle service brake delay — safety critical",
  "Left track shoe wear below minimum spec — replacement needed",
  "Boom control lag during precision lifting operations",
  "Engine coolant overtemp under heavy load — water pump suspect",
  "Intermittent cab display blackout — electrical fault",
  "Main pump casing oil leak — active drip, fire risk flagged",
  "Front left tyre slow puncture — screw in tread",
  "Slew ring grinding noise — full left rotation only",
  "Fuel contamination in coolant — head gasket suspected",
  "Severe steering pull to right — tie rod or cylinder imbalance",
  "Cab driver door hinge sheared — door not latching",
  "Water pump bearing noise — progressive worsening over 3 shifts",
  "Operator-reported engine oil pressure warning at idle",
  "Exhaust emitting black smoke under load — turbo or injector issue",
  "Rear axle making clunking noise during direction change",
  "Air filter restriction indicator on — filter not recently serviced",
  "Windshield crack — not impeding visibility but flagged per safety policy",
]

const maintenanceTitles = [
  "Scheduled 250-hour preventive maintenance service",
  "Scheduled 500-hour preventive maintenance service",
  "Scheduled 1,000-hour major service and inspection",
  "Hydraulic cylinder seal replacement — boom assembly",
  "Engine diagnostic and fault code resolution",
  "Transmission oil analysis and service",
  "Boom pivot hydraulic return line repair",
  "Track replacement — left and right side",
  "Air conditioning system recharge and compressor replacement",
  "Swing motor overhaul — thrust washer replacement",
  "Final drive oil service — both sides",
  "Engine overhaul — top end and bottom end",
  "Brake system inspection and fluid flush",
  "Hydraulic filter bypass investigation and repair",
  "Battery bank replacement — 3-unit set",
  "Welding repair — dozer blade stress crack",
  "Water pump bearing replacement — coolant circuit",
  "Tyre replacement and wheel alignment check",
  "Electrical harness repair — cab instrument cluster",
  "Cooling system flush and thermostat replacement",
]

const maintenanceDescriptions = [
  "Performed full preventive maintenance per OEM schedule. Engine oil and filter, hydraulic return filter, fuel primary and secondary filters, and all greasing points serviced. Fluid levels checked and topped up. No deficiencies found.",
  "Complete 500-hour service performed. All filters replaced, coolant concentration verified, battery load tested (pass), brake adjustment confirmed within spec, and full fluid sample kit submitted to lab for analysis.",
  "Major 1,000-hour service completed. All engine consumables replaced. Transmission serviced. Undercarriage measured and documented. Hydraulic system flushed and recharged. All safety systems verified — working correctly.",
  "Boom cylinder removed and taken to workshop. Seals replaced with OEM kit — wiper, rod, and piston seals all replaced. Cylinder honed to remove minor scoring. Reassembled and pressure tested to 3,500 PSI — no leaks. Reinstalled and function tested through full range of motion.",
  "Ran electronic diagnostic using factory service tool. Found fault code E360 (turbo inlet pressure sensor). Sensor disconnected, cleaned, re-seated — fault remained. Sensor replaced with OEM part. Fault cleared and road test performed under load — no recurrence.",
  "Transmission oil drained and inspected. Sample from previous service interval showed elevated iron at 38 ppm — above the 25 ppm alert threshold. Magnetic plug showed fine metallic particles consistent with normal clutch wear. Full flush, inspection, and refill completed. Re-sampled and sent to lab.",
  "Hydraulic return line at boom pivot isolated and removed. Hose replaced with new OEM hose assembly. Fittings cleaned and torqued to spec. System pressure tested — no leaks. Area cleaned. Unit returned to service.",
  "Full undercarriage replacement completed. Both track chains replaced, front idlers re-surfaced, rear sprockets replaced (wear past 50% on outer face), and track shoes replaced with new standard-duty shoes. All torques verified. Break-in inspection to be carried out at 50 hours.",
  "Refrigerant recovered, system vacuumed for 45 minutes, and recharged to manufacturer spec (1,100g R134a). Compressor clutch inspected — slipping at engagement. Compressor clutch replaced. Cab temperature tested — achieving 20°C from 38°C ambient in under 8 minutes.",
  "Swing motor disassembled and inspected. Thrust washers on main shaft measured at 3.2mm — below 4.0mm minimum. Both thrust washers replaced. Motor reassembled and tested through 10 full rotations — smooth and quiet. Swing speed returned to normal.",
  "Final drive oil drain on both sides at 3,000-hour service interval. Left side sample showed minor metallic content — consistent with normal break-in residue from last undercarriage service. Right side clear. Both refilled to spec. Level confirmed and drain plugs torqued.",
  "Major engine overhaul performed. Pistons (6 off), rings, cylinder liners, main bearings, and connecting rod bearings replaced. Valve seats re-cut and lapped. Cylinder head pressure tested — no cracks found. Engine reassembled and run in on engine stand per factory 2-hour procedure. No oil or coolant leaks detected.",
  "Brake system inspection in response to operator concern. Brake pads measured at 4.2mm (minimum 3.0mm) — within limits. Caliper slides cleaned and lubricated. Brake fluid flushed — fluid was dark and moisture-contaminated. New DOT 3 fluid installed. Pedal feel improved significantly.",
  "Investigated intermittent hydraulic pressure fault logged by operator over 3 shifts. System pressure measured — dropping to 180 bar intermittently from normal 240 bar. Root cause found: loose return filter housing was bypassing under pressure. Housing tightened and O-ring replaced. Fault not reproducible after repair.",
  "All three main batteries failed load test — capacity below 55%. Batteries removed, terminals and battery tray cleaned of corrosion. Three new 200Ah batteries installed, interconnect cables replaced, and charging system verified. Load test passed at 97% capacity.",
]

const equipmentUnitNotesSummaries = [
  "Engine approaching 5,000-hour major service threshold — parts pre-ordered.",
  "Left boom cylinder replaced 6 months ago — monitor seal condition.",
  "Returned from extended deployment — full service completed, cleared for redeployment.",
  "Track tension adjusted last week — re-check at next 50-hour inspection.",
  "Electrical fault E360 resolved — no recurrence since sensor replacement.",
  "Cab HVAC serviced — refrigerant recharged, compressor clutch replaced.",
  "Battery bank replaced — full charge verified, warranty period started.",
  "Monitor for upcoming 500-hour service interval — due in approximately 2 weeks.",
  "Undercarriage at 18% wear — well within tolerance. Next check at 1,000 hours.",
  "Final drive oil sampled last service — minor metallic content noted, within limits.",
  "Boom control lag investigated — pilot valve cleaned, issue resolved.",
  "Windshield crack noted — replacement scheduled for next available downtime.",
  null,
  null,
  null,
]

// ─── Rental reason builder (matches parseNotes format used in AdminRentalsPage) ─

const rentalPurposes = [
  "Bulk earthworks and overburden removal for phase 3 expansion",
  "Temporary haul road grading and compaction support",
  "Pipeline trench excavation and backfill — 2.4 km section",
  "Concrete placement for pump house foundation slab",
  "Crane support for heat exchanger module installation",
  "Dewatering and slurry removal from settling pond",
  "Fuel and lube servicing support for remote drill sites",
  "Compaction of subgrade and granular base for new access road",
  "Material loading at ore crusher for shift change coverage",
  "Welding and pipe fitting on the compressor station tie-in",
  "Electrical cable installation support — substation expansion",
  "Drill-and-blast hole preparation on North Pit bench 7",
  "Turnaround maintenance support — heavy lift and rigging",
  "Camp road maintenance and pothole repair",
  "Tailings dike re-profiling and slope stabilisation",
  "Sand and aggregate delivery from borrow pit to plant",
  "Tank farm cleaning and hydro-excavation of buried lines",
  "Overhaul support for steam plant heat exchangers",
  "Load-out of equipment at rail transfer terminal",
  "Site remediation and topsoil spreading — reclamation cell 2",
]

const rentalExtraNotesOptions = [
  "Two-person crew will be operating in rotation. Both have valid certifications on file.",
  "Night shift operations planned — confirm lighting plant is available with this unit.",
  "Site has 6% grade access road — operator must be experienced on steep terrain.",
  "Weather delay possible. Operator will shelter equipment in the laydown area if needed.",
  "HSE site orientation required before equipment release. Supervisor contact: M. Carter.",
  "Equipment to remain on-site over weekend — security patrol is in place.",
  "Operator is new to this site. Full site-specific safety induction completed today.",
  "Equipment will be sharing a work area with a crawler crane — spotter required at all times.",
  "Client project manager has requested daily operating hour logs be submitted.",
  "This is a replacement unit — original unit pulled for unscheduled maintenance.",
  "Work is within 10 metres of buried utility corridor — ground disturbance permit required.",
  "Cross-charge to project cost code OPS-14C. Budget approval from D. Chen on file.",
]

const rejectionReasons = [
  "Unit is already committed to the Tailings Cell 4 project through the requested date range. No equivalent units available in the yard during this window.",
  "Operator on the request does not have current certification for this equipment type on file. Please resubmit once certification is confirmed with HSE.",
  "Equipment requires a scheduled 500-hour service before next deployment — it is not available for rental until service is complete.",
  "Request overlaps with an existing approved rental for the same unit. Requester advised to check the equipment availability calendar.",
  "Work scope described does not justify high-risk equipment category. Please coordinate with the Site Superintendent for an appropriate equipment substitution.",
  "Budget approval for this cost code has not been confirmed. Request held pending finance sign-off. Resubmit once approval is received.",
  "Requested dates fall within the equipment's scheduled refinery turnaround support block — unit is pre-committed and cannot be reallocated.",
  "Insufficient notice for mobilisation to the remote site. Minimum lead time is 48 hours. Please resubmit with adjusted start date.",
  "Unit flagged with an open safety defect report. Cannot be released until the maintenance team clears the unit. Estimated clearance: 2–3 business days.",
]

function buildRentalReason(purpose: string, site: string, extras?: string): string {
  const parts = [`Purpose: ${purpose}`, `Site: ${site}`]
  if (extras) parts.push(`Notes: ${extras}`)
  return parts.join("\n")
}

const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const
const ISSUE_STATUS_VALUES = ["OPEN", "REVIEWED", "IN_PROGRESS", "RESOLVED"] as const
const MAINTENANCE_TRIGGERS = ["ROUTINE", "ISSUE_REPORTED", "INSPECTION", "BREAKDOWN", "ADMIN_REQUEST"] as const
const MAINTENANCE_STATUS_VALUES = ["OPEN", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDateWithinPast(daysBack: number) {
  const d = new Date()
  d.setDate(d.getDate() - randomInt(0, daysBack))
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function slugCode(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 6)
}

function uniqueWithCounter(base: string, used: Set<string>) {
  let next = base
  let counter = 2
  while (used.has(next)) {
    next = `${base}-${counter}`
    counter++
  }
  used.add(next)
  return next
}

function main() {
  const runSeed = db.transaction(() => {
    db.exec("DELETE FROM AuditLog")
    db.exec("DELETE FROM Note")
    db.exec("DELETE FROM IssueReport")
    db.exec("DELETE FROM MaintenanceRecord")
    db.exec("DELETE FROM Rental")
    db.exec("DELETE FROM EquipmentUnit")
    db.exec("DELETE FROM EquipmentType")
    db.exec("DELETE FROM EquipmentCategory")
    db.exec("DELETE FROM Location")
    db.exec("DELETE FROM User")

    const insertCategory = db.prepare("INSERT INTO EquipmentCategory (id, name, code) VALUES (?, ?, ?)")
    const insertLocation = db.prepare("INSERT INTO Location (id, name, code, region) VALUES (?, ?, ?, ?)")
    const insertUser = db.prepare("INSERT INTO User (id, name, email, passwordHash, role, department, phoneNumber, position, isAvatarIcon, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertType = db.prepare("INSERT INTO EquipmentType (id, name, code, manufacturer, model, categoryId, description, defaultMaintenanceDays, defaultRentalWarningDays, requiresApproval, highRisk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertUnit = db.prepare("INSERT INTO EquipmentUnit (id, assetTag, serialNumber, equipmentTypeId, locationId, status, year, inServiceDate, lastMaintenanceAt, nextMaintenanceDue, notesSummary, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
    const insertRental = db.prepare("INSERT INTO Rental (id, equipmentUnitId, equipmentTypeId, requesterId, approverId, checkedOutById, returnedById, locationId, status, reason, jobSite, requestedStart, requestedEnd, approvedStart, approvedEnd, checkedOutAt, returnedAt, rejectedReason, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertAuditLog = db.prepare("INSERT INTO AuditLog (id, action, actorId, rentalId, equipmentUnitId, maintenanceRecordId, issueReportId, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertIssue = db.prepare("INSERT INTO IssueReport (id, equipmentUnitId, reportedById, title, description, severity, status, reportedAt, resolvedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertMaintenance = db.prepare("INSERT INTO MaintenanceRecord (id, equipmentUnitId, technicianId, status, trigger, issueReportId, title, description, scheduledFor, startedAt, completedAt, nextDueAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    const insertNote = db.prepare("INSERT INTO Note (id, authorId, body, targetType, equipmentUnitId, rentalId, maintenanceRecordId, issueReportId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")

    // ── Categories ────────────────────────────────────────────────────────────
    const createdCategories = new Map<string, string>()
    for (const category of categories) {
      const id = generateId()
      insertCategory.run(id, category.name, category.code)
      createdCategories.set(category.code, id)
    }

    // ── Locations ─────────────────────────────────────────────────────────────
    const createdLocations: { id: string }[] = []
    for (const location of locations) {
      const id = generateId()
      insertLocation.run(id, location.name, location.code, location.region)
      createdLocations.push({ id })
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    const users: { id: string; role: string; name: string }[] = []

    const adminProfiles = [
      { name: "Administrator", position: "Operations Director" },
      { name: "Sarah Jenkins", position: "Fleet Manager" },
      { name: "David Chen", position: "Site Superintendent" },
      { name: "Amanda Torres", position: "Logistics Coordinator" },
      { name: "Michael O'Connor", position: "HSE Manager" },
      { name: "Lisa Wong", position: "Equipment Dispatcher" },
    ]

    for (let i = 0; i < adminProfiles.length; i++) {
      const id = generateId()
      insertUser.run(id, adminProfiles[i].name, `admin${i + 1}@equiptrack.local`, DEFAULT_PASSWORD_HASH, "ADMIN",
        "Administration", `555-010${i}`, adminProfiles[i].position, 1,
        randomItem(["hardhat", "wrench", "truck", "clipboard", "gear"]))
      users.push({ id, role: "ADMIN", name: adminProfiles[i].name })
    }

    const fieldWorkerProfiles = [
      { name: "James Smith",        position: "Heavy Equipment Operator" },
      { name: "Maria Garcia",       position: "Site Supervisor" },
      { name: "John Johnson",       position: "Foreman" },
      { name: "Robert Williams",    position: "Heavy Equipment Operator" },
      { name: "Michael Brown",      position: "Laborer" },
      { name: "William Jones",      position: "Surveyor" },
      { name: "David Miller",       position: "Site Supervisor" },
      { name: "Richard Davis",      position: "Heavy Equipment Operator" },
      { name: "Joseph Garcia",      position: "Foreman" },
      { name: "Thomas Rodriguez",   position: "Heavy Equipment Operator" },
      { name: "Charles Wilson",     position: "Laborer" },
      { name: "Christopher Martinez", position: "Heavy Equipment Operator" },
      { name: "Daniel Anderson",    position: "Site Supervisor" },
      { name: "Matthew Taylor",     position: "Surveyor" },
      { name: "Anthony Thomas",     position: "Foreman" },
      { name: "Mark Hernandez",     position: "Heavy Equipment Operator" },
      { name: "Donald Moore",       position: "Heavy Equipment Operator" },
      { name: "Steven Martin",      position: "Laborer" },
    ]

    for (let i = 0; i < fieldWorkerProfiles.length; i++) {
      const id = generateId()
      insertUser.run(id, fieldWorkerProfiles[i].name, `field${i + 1}@equiptrack.local`, DEFAULT_PASSWORD_HASH, "FIELD_WORKER",
        randomItem(departments), `555-020${String(i).padStart(2, "0")}`,
        fieldWorkerProfiles[i].position, 1, randomItem(["hardhat", "truck", "clipboard"]))
      users.push({ id, role: "FIELD_WORKER", name: fieldWorkerProfiles[i].name })
    }

    const maintenanceProfiles = [
      { name: "Paul Lee",         position: "Heavy Duty Mechanic" },
      { name: "Kevin Perez",      position: "Shop Foreman" },
      { name: "Brian Thompson",   position: "Electrical Technician" },
      { name: "George White",     position: "Heavy Duty Mechanic" },
      { name: "Edward Harris",    position: "Welder" },
      { name: "Ronald Sanchez",   position: "Service Truck Operator" },
      { name: "Timothy Clark",    position: "Heavy Duty Mechanic" },
      { name: "Jason Ramirez",    position: "Electrical Technician" },
      { name: "Jeffrey Lewis",    position: "Heavy Duty Mechanic" },
      { name: "Ryan Robinson",    position: "Welder" },
      { name: "Jacob Walker",     position: "Shop Foreman" },
      { name: "Gary Young",       position: "Service Truck Operator" },
    ]

    for (let i = 0; i < maintenanceProfiles.length; i++) {
      const id = generateId()
      insertUser.run(id, maintenanceProfiles[i].name, `maintenance${i + 1}@equiptrack.local`, DEFAULT_PASSWORD_HASH, "MAINTENANCE",
        "Maintenance", `555-030${String(i).padStart(2, "0")}`,
        maintenanceProfiles[i].position, 1, randomItem(["wrench", "gear", "hardhat"]))
      users.push({ id, role: "MAINTENANCE", name: maintenanceProfiles[i].name })
    }

    const admins = users.filter((u) => u.role === "ADMIN")
    const fieldWorkers = users.filter((u) => u.role === "FIELD_WORKER")
    const maintenanceUsers = users.filter((u) => u.role === "MAINTENANCE")

    // ── Equipment Types ───────────────────────────────────────────────────────
    const createdTypes: { id: string; code: string; defaultMaintenanceDays: number }[] = []
    const usedTypeCodes = new Set<string>()

    for (const [name, categoryCode] of equipmentCatalog) {
      const manufacturer = randomItem(manufacturers)
      const model = `${slugCode(name)}-${randomInt(100, 999)}`
      const defaultMaintenanceDays = randomItem([30, 45, 60, 90, 120, 180])
      const requiresApproval = Math.random() < 0.45 ? 1 : 0
      const highRisk = Math.random() < 0.2 ? 1 : 0
      const typeCode = uniqueWithCounter(`${slugCode(name)}-${randomInt(10, 99)}`, usedTypeCodes)
      const id = generateId()

      insertType.run(id, name, typeCode, manufacturer, model,
        createdCategories.get(categoryCode)!, `${name} used for industrial and heavy civil operations.`,
        defaultMaintenanceDays, randomItem([3, 5, 7, 10, 14]), requiresApproval, highRisk)

      createdTypes.push({ id, code: typeCode, defaultMaintenanceDays })
    }

    // ── Equipment Units ───────────────────────────────────────────────────────
    const allUnits: { id: string; assetTag: string; equipmentTypeId: string }[] = []
    const usedAssetTags = new Set<string>()
    const usedSerialNumbers = new Set<string>()

    for (const equipmentType of createdTypes) {
      const unitCount = randomInt(3, 8)
      const typeCodeClean = equipmentType.code.replace(/[^A-Z0-9-]/g, "").slice(0, 8)

      for (let i = 1; i <= unitCount; i++) {
        const location = randomItem(createdLocations)
        const lastMaintenanceAt = randomDateWithinPast(180)
        const nextMaintenanceDue = addDays(lastMaintenanceAt, equipmentType.defaultMaintenanceDays ?? 90)

        let status = "AVAILABLE"
        const roll = Math.random()
        if (roll < 0.60) status = "AVAILABLE"
        else if (roll < 0.67) status = "RESERVED"
        else if (roll < 0.78) status = "CHECKED_OUT"
        else if (roll < 0.83) status = "DUE_SOON_MAINTENANCE"
        else if (roll < 0.92) status = "IN_MAINTENANCE"
        else status = "OUT_OF_SERVICE"

        const assetTag = uniqueWithCounter(`${typeCodeClean}-${String(i).padStart(3, "0")}`, usedAssetTags)
        const serialNumber = uniqueWithCounter(`SN-${typeCodeClean}-${randomInt(100000, 999999)}`, usedSerialNumbers)
        const id = generateId()

        insertUnit.run(id, assetTag, serialNumber, equipmentType.id, location.id,
          status, randomInt(2012, 2026), randomDateWithinPast(1800).toISOString(),
          lastMaintenanceAt.toISOString(), nextMaintenanceDue.toISOString(),
          randomItem(equipmentUnitNotesSummaries))

        allUnits.push({ id, assetTag, equipmentTypeId: equipmentType.id })
      }
    }

    // ── Rentals ───────────────────────────────────────────────────────────────
    // Track created rentals and maintenance records for notes
    const createdRentals: { id: string }[] = []
    const createdMaintenanceRecords: { id: string }[] = []

    // Helper to insert one rental
    function insertOneRental(
      unit: { id: string; assetTag: string; equipmentTypeId: string },
      requester: { id: string; role: string; name: string },
      approver: { id: string; role: string; name: string } | null,
      location: { id: string },
      status: string,
      requestedStart: Date,
      requestedEnd: Date,
      reason: string,
      site: string,
    ) {
      const checkedOutBy = (status === "CHECKED_OUT" || status === "RETURNED" || status === "OVERDUE")
        ? randomItem(admins) : null
      const returnedBy = status === "RETURNED" ? randomItem(admins) : null
      const rentalId = generateId()
      const now = new Date().toISOString()

      insertRental.run(rentalId, unit.id, unit.equipmentTypeId, requester.id,
        approver?.id ?? null, checkedOutBy?.id ?? null, returnedBy?.id ?? null, location.id,
        status, reason, site,
        requestedStart.toISOString(), requestedEnd.toISOString(),
        approver ? requestedStart.toISOString() : null,
        approver ? requestedEnd.toISOString() : null,
        (status === "CHECKED_OUT" || status === "RETURNED" || status === "OVERDUE")
          ? requestedStart.toISOString() : null,
        status === "RETURNED" ? requestedEnd.toISOString() : null,
        status === "REJECTED" ? randomItem(rejectionReasons) : null,
        now, now)

      createdRentals.push({ id: rentalId })

      insertAuditLog.run(generateId(), "REQUEST_SUBMITTED", requester.id, rentalId, unit.id,
        null, null, `Rental request submitted for ${unit.assetTag} by ${requester.name}.`, now)

      if (approver) {
        insertAuditLog.run(generateId(),
          status === "REJECTED" ? "REQUEST_REJECTED" : "REQUEST_APPROVED",
          approver.id, rentalId, unit.id, null, null,
          `Rental ${status.toLowerCase()} by ${approver.name}.`, now)
      }
      if (checkedOutBy) {
        insertAuditLog.run(generateId(), "CHECKED_OUT", checkedOutBy.id, rentalId, unit.id,
          null, null, `Equipment ${unit.assetTag} checked out by ${checkedOutBy.name}.`, now)
      }
      if (returnedBy) {
        insertAuditLog.run(generateId(), "RETURNED", returnedBy.id, rentalId, unit.id,
          null, null, `Equipment ${unit.assetTag} returned by ${returnedBy.name}.`, now)
      }

      return rentalId
    }

    // ── Batch rental clusters (simulating multi-select requests from new UI) ──
    // Each batch = same requester, same site, same date window, 2–4 units
    const batchScenarios: {
      status: string
      unitCount: number
      daysBack: number
      durationDays: number
    }[] = [
      { status: "PENDING",    unitCount: 3, daysBack: 1,  durationDays: 7  },
      { status: "PENDING",    unitCount: 2, daysBack: 2,  durationDays: 5  },
      { status: "PENDING",    unitCount: 4, daysBack: 0,  durationDays: 14 },
      { status: "APPROVED",   unitCount: 3, daysBack: 4,  durationDays: 10 },
      { status: "APPROVED",   unitCount: 2, daysBack: 5,  durationDays: 7  },
      { status: "APPROVED",   unitCount: 4, daysBack: 3,  durationDays: 12 },
      { status: "CHECKED_OUT", unitCount: 3, daysBack: 8,  durationDays: 14 },
      { status: "CHECKED_OUT", unitCount: 2, daysBack: 10, durationDays: 7  },
      { status: "CHECKED_OUT", unitCount: 4, daysBack: 6,  durationDays: 21 },
      { status: "RETURNED",   unitCount: 3, daysBack: 20, durationDays: 10 },
      { status: "RETURNED",   unitCount: 2, daysBack: 25, durationDays: 7  },
      { status: "RETURNED",   unitCount: 4, daysBack: 30, durationDays: 14 },
      { status: "REJECTED",   unitCount: 3, daysBack: 15, durationDays: 7  },
      { status: "REJECTED",   unitCount: 2, daysBack: 18, durationDays: 5  },
      { status: "OVERDUE",    unitCount: 2, daysBack: 25, durationDays: 7  },
      { status: "PENDING",    unitCount: 3, daysBack: 0,  durationDays: 10 },
      { status: "APPROVED",   unitCount: 3, daysBack: 2,  durationDays: 14 },
      { status: "CHECKED_OUT", unitCount: 3, daysBack: 12, durationDays: 10 },
      { status: "RETURNED",   unitCount: 2, daysBack: 40, durationDays: 5  },
      { status: "PENDING",    unitCount: 4, daysBack: 1,  durationDays: 7  },
    ]

    for (const batch of batchScenarios) {
      const requester = randomItem(fieldWorkers)
      const approver = (batch.status !== "PENDING") ? randomItem(admins) : null
      const location = randomItem(createdLocations)
      const site = randomItem(jobSites)
      const purpose = randomItem(rentalPurposes)
      const extras = Math.random() < 0.6 ? randomItem(rentalExtraNotesOptions) : undefined
      const reason = buildRentalReason(purpose, site, extras)
      const requestedStart = randomDateWithinPast(batch.daysBack)
      const requestedEnd = addDays(requestedStart, batch.durationDays)

      // Pick distinct units for this batch
      const usedUnitIds = new Set<string>()
      for (let k = 0; k < batch.unitCount; k++) {
        let unit = randomItem(allUnits)
        let attempts = 0
        while (usedUnitIds.has(unit.id) && attempts < 20) {
          unit = randomItem(allUnits)
          attempts++
        }
        usedUnitIds.add(unit.id)
        insertOneRental(unit, requester, approver, location, batch.status, requestedStart, requestedEnd, reason, site)
      }
    }

    // ── Individual (non-batch) rentals to fill out the data set ──────────────
    for (let i = 0; i < 200; i++) {
      const unit = randomItem(allUnits)
      const requester = randomItem(fieldWorkers)
      const location = randomItem(createdLocations)
      const site = randomItem(jobSites)
      const purpose = randomItem(rentalPurposes)
      const extras = Math.random() < 0.4 ? randomItem(rentalExtraNotesOptions) : undefined
      const reason = buildRentalReason(purpose, site, extras)

      let status = "PENDING"
      const roll = Math.random()
      if (roll < 0.12) status = "PENDING"
      else if (roll < 0.20) status = "REJECTED"
      else if (roll < 0.32) status = "APPROVED"
      else if (roll < 0.44) status = "RESERVED"
      else if (roll < 0.68) status = "CHECKED_OUT"
      else if (roll < 0.90) status = "RETURNED"
      else status = "OVERDUE"

      const approver = (status !== "PENDING") ? randomItem(admins) : null
      const requestedStart = randomDateWithinPast(60)
      const requestedEnd = addDays(requestedStart, randomInt(2, 21))

      insertOneRental(unit, requester, approver, location, status, requestedStart, requestedEnd, reason, site)
    }

    // ── Issue Reports ─────────────────────────────────────────────────────────
    const createdIssues: { id: string }[] = []

    // Weighted severity distribution — more LOW/MEDIUM than HIGH/CRITICAL
    const severityWeighted: (typeof ISSUE_SEVERITIES[number])[] = [
      "LOW", "LOW", "MEDIUM", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL",
    ]

    for (let i = 0; i < 180; i++) {
      const unit = randomItem(allUnits)
      const reporter = randomItem([...fieldWorkers, ...maintenanceUsers])
      const severity = randomItem(severityWeighted)
      const status = randomItem(ISSUE_STATUS_VALUES)
      const issueId = generateId()
      const reportedAt = randomDateWithinPast(120)

      // Build a richer description that matches what the MaintenanceReportPage captures
      const baseDescription = randomItem(issueDescriptionBodies)
      const techAddendum = Math.random() < 0.4
        ? ` Severity assessed as ${severity} by reporting ${reporter.role === "MAINTENANCE" ? "technician" : "operator"} ${reporter.name}.`
        : ""

      insertIssue.run(issueId, unit.id, reporter.id,
        randomItem(issueTitles),
        baseDescription + techAddendum,
        severity, status, reportedAt.toISOString(),
        status === "RESOLVED" ? randomDateWithinPast(30).toISOString() : null)

      createdIssues.push({ id: issueId })

      insertAuditLog.run(generateId(), "ISSUE_REPORTED", reporter.id, null, unit.id,
        null, issueId, `Issue reported against ${unit.assetTag} by ${reporter.name}.`, reportedAt.toISOString())
    }

    // ── Maintenance Records ───────────────────────────────────────────────────
    for (let i = 0; i < 320; i++) {
      const unit = randomItem(allUnits)
      const tech = Math.random() < 0.85 ? randomItem(maintenanceUsers) : null
      const createdAt = randomDateWithinPast(180)
      const trigger = randomItem(MAINTENANCE_TRIGGERS)

      let issueReportId: string | null = null
      if (trigger === "ISSUE_REPORTED" && createdIssues.length > 0) {
        issueReportId = randomItem(createdIssues).id
      }

      const status = randomItem(MAINTENANCE_STATUS_VALUES)
      const startedAt = (status === "IN_PROGRESS" || status === "COMPLETED")
        ? addDays(createdAt, randomInt(0, 5)) : null
      const completedAt = (status === "COMPLETED" && startedAt)
        ? addDays(startedAt, randomInt(1, 10)) : null

      const recordId = generateId()
      const now = new Date().toISOString()

      insertMaintenance.run(recordId, unit.id, tech?.id ?? null, status, trigger,
        issueReportId,
        randomItem(maintenanceTitles),
        randomItem(maintenanceDescriptions),
        addDays(createdAt, randomInt(1, 14)).toISOString(),
        startedAt?.toISOString() ?? null, completedAt?.toISOString() ?? null,
        completedAt ? addDays(completedAt, randomItem([30, 60, 90, 120])).toISOString() : null,
        createdAt.toISOString(), now)

      createdMaintenanceRecords.push({ id: recordId })

      insertAuditLog.run(generateId(),
        status === "COMPLETED" ? "MAINTENANCE_COMPLETED" : "MAINTENANCE_OPENED",
        tech?.id ?? null, null, unit.id, recordId, null,
        `Maintenance record ${status.toLowerCase()} for ${unit.assetTag}${tech ? ` — assigned to ${tech.name}` : ""}.`, now)
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    // Equipment unit notes
    for (let i = 0; i < 120; i++) {
      const unit = randomItem(allUnits)
      const author = randomItem([...users, ...maintenanceUsers])
      const daysAgo = randomInt(0, 90)
      const noteDate = new Date()
      noteDate.setDate(noteDate.getDate() - daysAgo)
      insertNote.run(generateId(), author.id, randomItem(equipmentNoteBodies),
        "EQUIPMENT_UNIT", unit.id, null, null, null, noteDate.toISOString())
    }

    // Rental notes
    const sampleRentals = createdRentals.slice(0, 120)
    for (let i = 0; i < 100; i++) {
      if (!sampleRentals.length) break
      const rental = randomItem(sampleRentals)
      const author = randomItem([...admins, ...fieldWorkers])
      const daysAgo = randomInt(0, 60)
      const noteDate = new Date()
      noteDate.setDate(noteDate.getDate() - daysAgo)
      insertNote.run(generateId(), author.id, randomItem(rentalNoteBodies),
        "RENTAL", null, rental.id, null, null, noteDate.toISOString())
    }

    // Maintenance record notes
    const sampleMaintenance = createdMaintenanceRecords.slice(0, 120)
    for (let i = 0; i < 100; i++) {
      if (!sampleMaintenance.length) break
      const record = randomItem(sampleMaintenance)
      const author = randomItem(maintenanceUsers)
      const daysAgo = randomInt(0, 90)
      const noteDate = new Date()
      noteDate.setDate(noteDate.getDate() - daysAgo)
      insertNote.run(generateId(), author.id, randomItem(maintenanceNoteBodies),
        "MAINTENANCE_RECORD", null, null, record.id, null, noteDate.toISOString())
    }

    // Issue report notes
    const sampleIssues = createdIssues.slice(0, 120)
    for (let i = 0; i < 100; i++) {
      if (!sampleIssues.length) break
      const issue = randomItem(sampleIssues)
      const author = randomItem([...maintenanceUsers, ...fieldWorkers])
      const daysAgo = randomInt(0, 60)
      const noteDate = new Date()
      noteDate.setDate(noteDate.getDate() - daysAgo)
      insertNote.run(generateId(), author.id, randomItem([...maintenanceNoteBodies, ...equipmentNoteBodies]),
        "ISSUE_REPORT", null, null, null, issue.id, noteDate.toISOString())
    }
  })

  runSeed()
  console.log("Seed complete.")
}

try {
  main()
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  db.close()
}
