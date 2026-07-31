/*
  config.js
  ---------
  This file contains the configuration for the survey, including the URL of the Google Apps Script
  that handles form submissions, the URL of the video tutorial, and the list of algorithms being 
  ranked. It also includes options for user roles, practice types, qualifications, subspecialties,
  and years of practice.
*/

const SURVEY_CONFIG = {

  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby9BlMX4CT7QNaAWNyJgkv8wB2hWCpKZ_Zb9iD59tLuKz2JbB8a9LPX1HUeFp5-UP1WKA/exec", //V1.5

  VIDEO_TUTORIAL_URL: "PASTE_VIDEO_LINK_HERE",

  // Each file inside images/<GLOBAL_CASE_ID>/ is a single pre-composed
  // strip image that already shows all 7 case columns baked in.
  // We just display it as one big image, we don't rebuild the grid.
  GLOBAL_CASE_ID: "2",

  /* The 7 algorithms being ranked. Experts never see "label", they only ever see "Algorithm 1" through "Algorithm 7", assigned in
  random order each time the survey loads.*/
  ALGORITHMS: [
    { id: "yiffana_pt",       label: "Percentile Threshold (Yiffana)" },
    { id: "yiffana_blanket",  label: "Percentile Threshold + Blanket" },
    { id: "pipeline_v10_61",  label: "Diffusion + Active Contour" },
    { id: "pipeline_v10_62",  label: "Diffusion + Active Contour (v2)" },
    { id: "pipeline_v10_63",  label: "Diffusion ∩ Contour (Consensus)" },
    { id: "pipeline_v10_70",  label: "Dual-Threshold + Morphology" },
    { id: "pipeline_v10_90",  label: "Bone-Growth Contour (Negative)" },
  ],

  /* You can modify these lists to suit your needs and change the options that the user 
  can select in the survey form. Make sure to keep the structure of the arrays intact. */
  ROLE_OPTIONS: [
    "Resident",
    "Fellow",
    "Attending/Consultant Orthopedic Surgeon",
    "Department Head/Chief",
    "Academic Faculty",
    "Other",
  ],

  PRACTICE_TYPE_OPTIONS: [
    "Academic Hospital",
    "Public Hospital",
    "Private Hospital",
    "Private Practice",
    "Mixed Practice",
    "N/A",
  ],

  QUALIFICATION_OPTIONS: [
    "MD",
    "MBBS/MBChB",
    "FRCS (Tr & Orth)",
    "FRCSC (Canada)",
    "Board Certified Orthopedic Surgeon",
    "Fellowship-trained Orthopedic Surgeon",
    "Other",
  ],

  SUBSPECIALTY_OPTIONS: [
    "Arthroplasty/Joint Replacement",
    "Sports Medicine",
    "Trauma",
    "Spine",
    "Hand & Upper Extremity",
    "Foot & Ankle",
    "Pediatric Orthopedics",
    "Orthopedic Oncology",
    "Other",
  ],

  YEARS_PRACTICE_OPTIONS: [
    "<5",
    "5-10",
    "11-20",
    ">20",
    "N/A",
  ],

};
