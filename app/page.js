'use client';

import { useState, useEffect } from 'react';

export default function RacePacingCalculator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    raceCategory: '', // 'triathlon' or 'running'
    email: '',
    raceType: '',
    pacingApproach: '',
    athleteLevel: '', // Recreational, Intermediate, Competitive, Elite
    currentWeight: '',
    raceWeight: '',
    age: '',
    gender: '',
    targetTime: '',
    maxHR: '',
    maxHRKnown: null,
    restingHR: '',
    restingHRKnown: null,
    thresholdHR: '',
    // Custom distances
    customSwimDistance: '',
    customSwimUnit: 'mi',
    customBikeDistance: '',
    customBikeUnit: 'mi',
    customRunDistance: '',
    customRunUnit: 'mi',
    // Running
    thresholdPace: '',
    thresholdPaceKnown: null,
    fastest5K: '',
    thresholdPower: '',
    // Triathlon Swim
    css: '',
    cssKnown: null,
    fastest100y: '',
    // Triathlon Bike
    ftp: '',
    ftpKnown: null,
    max20minWatts: ''
  });
  const [results, setResults] = useState(null);
  const [whatIf, setWhatIf] = useState({
    swimPace: null, // pace per 100y in seconds
    t1Time: null, // seconds
    bikeSpeed: null, // mph
    t2Time: null, // seconds
    runPace: null // pace per mile in seconds
  });

  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const colors = {
    primary: '#D62027',
    charcoal: '#231F20',
    maroon: '#600D0D',
    light: '#F4F4F9'
  };

  const raceTypes = {
    'Sprint Triathlon': { 
      distance: 'Sprint Distance', 
      swim: '0.5 mi (750m)', bike: '12.4 mi (20km)', run: '3.1 mi (5K)',
      type: 'triathlon'
    },
    'Olympic Triathlon': { 
      distance: 'Olympic Distance',
      swim: '0.93 mi (1500m)', bike: '24.8 mi (40km)', run: '6.2 mi (10K)',
      type: 'triathlon'
    },
    'Half Ironman (70.3)': { 
      distance: '70.3 Miles',
      swim: '1.2 mi (1.9km)', bike: '56 mi (90km)', run: '13.1 mi',
      type: 'triathlon'
    },
    'Full Ironman (140.6)': { 
      distance: '140.6 Miles',
      swim: '2.4 mi (3.8km)', bike: '112 mi (180km)', run: '26.2 mi',
      type: 'triathlon'
    },
    'Custom Triathlon': {
      distance: 'Custom Distance',
      type: 'triathlon'
    },
    '5K Run': { distance: '3.1 miles (5K)', type: 'run' },
    '10K Run': { distance: '6.2 miles (10K)', type: 'run' },
    'Half Marathon': { distance: '13.1 Miles', type: 'run' },
    'Full Marathon': { distance: '26.2 Miles', type: 'run' },
    'Custom Run': {
      distance: 'Custom Distance',
      type: 'run'
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions
  const paceToSeconds = (paceStr) => {
    const parts = paceStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const secondsToPace = (seconds) => {
    let mins = Math.floor(seconds / 60);
    let secs = Math.round(seconds % 60);
    // Handle edge case where rounding gives 60 seconds
    if (secs === 60) {
      mins += 1;
      secs = 0;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const secondsToTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMaxHR = (age, gender, over40) => {
    if (over40) return 208 - (0.7 * age);
    return gender === 'male' ? 211 - (0.64 * age) : 206 - (0.88 * age);
  };

  const calculateThresholdHR = (maxHR, restingHR) => {
    if (restingHR) {
      const hrr = maxHR - restingHR;
      return Math.round(restingHR + (0.80 * hrr));
    }
    return Math.round(maxHR * 0.85);
  };

  // Physics-based bike speed calculation using proper aerodynamic model
  const calculateBikeSpeed = (powerWatts, riderWeightLbs, raceType) => {
    // Convert to metric
    const riderWeightKg = riderWeightLbs / 2.205;
    const bikeWeightKg = 9; // Typical tri bike with gear
    const totalWeightKg = riderWeightKg + bikeWeightKg;
    
    // Physical constants
    const Crr = 0.004; // Coefficient of rolling resistance (good road tires)
    const rho = 1.225; // Air density (kg/m³) at sea level, 20°C
    const dtLoss = 0.02; // Drivetrain loss (2%)
    const grade = 0; // Assume flat for estimation
    const headwind = 0; // No wind for estimation
    
    // CdA values for realistic RACE DAY estimates
    // Accounts for: proper aero position, real-world wind, course variation
    // Elite pros: 0.18-0.20, competitive AG: 0.22-0.24, average AG: 0.26-0.28
    const cdaValues = {
      'Sprint Triathlon': 0.29,      // Shorter duration, less critical aero
      'Olympic Triathlon': 0.28,     // Moderate race-day aero
      'Half Ironman (70.3)': 0.28,   // Sustained aero position
      'Full Ironman (140.6)': 0.28,  // Long-course, conservative estimate
      'Custom Triathlon': 0.28       // Default to Olympic/HIM values
    };
    
    const cda = cdaValues[raceType] || 0.25;
    
    // Effective power after drivetrain loss
    const effectivePower = powerWatts * (1 - dtLoss);
    
    // Solve cubic equation: a*v³ + b*v² + c*v + d = 0
    // Based on: Power = (F_gravity + F_rolling + F_drag) × velocity
    
    const a = 0.5 * cda * rho;
    const b = headwind * cda * rho;
    const gradeRadians = Math.atan(grade / 100);
    const c = 9.8067 * totalWeightKg * (Math.sin(gradeRadians) + Crr * Math.cos(gradeRadians));
    const d = -effectivePower;
    
    // Cardano's formula for solving cubic equation
    const Q = (3 * a * c - b * b) / (9 * a * a);
    const R = (9 * a * b * c - 27 * a * a * d - 2 * b * b * b) / (54 * a * a * a);
    const discriminant = Q * Q * Q + R * R;
    
    let speedMs;
    if (discriminant >= 0) {
      const sqrtD = Math.sqrt(discriminant);
      const S = Math.cbrt(R + sqrtD);
      const T = Math.cbrt(R - sqrtD);
      speedMs = S + T - (b / (3 * a));
    } else {
      // Use alternative method for negative discriminant
      const theta = Math.acos(R / Math.sqrt(-Q * Q * Q));
      speedMs = 2 * Math.sqrt(-Q) * Math.cos(theta / 3) - (b / (3 * a));
    }
    
    // Convert m/s to mph
    const speedMph = speedMs * 2.237;
    
    return Math.max(0, speedMph); // Ensure non-negative
  };

  const getRaceStrategy = (raceType) => {
    const strategies = {
      'Sprint Triathlon': {
        mistake: 'Racing like it\'s a 45-60 minute suffer-fest from the gun.',
        swim: 'Calm and controlled. You should exit slightly under redline, not gasping.',
        bike: 'Hard but smooth. Avoid surging out of turns or chasing faster riders.',
        run: 'First half = control on target. Second half = let it all out and race.',
        mindset: 'Sprint rewards fitness, but still punishes stupidity. You can\'t win it on the bike if you destroy the run.'
      },
      'Olympic Triathlon': {
        mistake: 'Treating it like a long sprint.',
        swim: 'First 400m controlled breathing. Build effort gradually, don\'t surge.',
        bike: 'Settle the first 10 minutes, then apply steady pressure to the wattage target. Increase cadence the final 5-10 minutes.',
        run: 'First 2K easy. Lock in rhythm. Final 2K empty the tank.',
        mindset: 'Olympic races are decided by bike discipline and run patience, not bravery.'
      },
      'Half Ironman (70.3)': {
        mistake: 'Riding "just a little too hard" because it feels easy early.',
        swim: 'Very controlled. Find breath rhythm and feet early if possible.',
        bike: 'Conservative first 20-30 minutes. Steady middle. Aim for a negative split. Increase cadence the final 5-10 minutes. Remember your fueling plan!',
        run: 'First 3-4 miles easy. Build to race pace by mile 6.',
        mindset: 'If the bike feels impressive, the run will often be disappointing.'
      },
      'Full Ironman (140.6)': {
        mistake: 'Racing the first half instead of preparing for the second.',
        swim: 'Extremely controlled. Rhythm over position.',
        bike: 'The number 1 key is your hydro/fueling plan! Conservative effort the first hour. Stay within your planned target wattage zones until special needs. Self-evaluation on modifying target wattage up or down in the back half. Increase cadence the final 5-10 minutes.',
        run: 'First 6-8 miles conservative. Hold steady through the middle. Walk the aid stations to maximize hydro/nutrition, and cooling. The back half will be painful; embrace it and finish strong.',
        mindset: 'Ironman is an execution event. You don\'t win it with heroics — you earn it with restraint.'
      },
      'Custom Triathlon': {
        mistake: 'Not adjusting strategy for your specific custom distance.',
        swim: 'Controlled breathing and rhythm. Find your pace based on the distance.',
        bike: 'Start conservative, build into your target power. Adjust fueling based on total bike duration.',
        run: 'Ease into your pace. Let your heart rate guide your effort level.',
        mindset: 'Execute your custom race with the same discipline as any standard distance.'
      },
      '5K Run': {
        mistake: 'Starting faster than goal pace because it feels "easy."',
        strategy: 'Start at goal pace. Hold miles 1-2. Push the final mile.',
        mindset: 'You don\'t race the first mile — you survive it well enough to race the last.'
      },
      '10K Run': {
        mistake: 'Overreaching at mile 2-3 and paying for it late.',
        strategy: 'Controlled start. Hold steady through miles 3-5. Push the final mile.',
        mindset: 'The 10K rewards patience and punishes impatience quietly.'
      },
      'Half Marathon': {
        mistake: 'Banking time early.',
        strategy: 'Conservative first 3 miles. Lock into rhythm mid-race. Negative split miles 10-13.',
        mindset: 'The best half marathons feel boring early and powerful late.'
      },
      'Full Marathon': {
        mistake: 'Letting excitement dictate the first 10 miles.',
        strategy: 'Very conservative first 10 miles. Manage miles 10-20. Grit miles 20-26 only if earned.',
        mindset: 'Marathons aren\'t finished with courage — they\'re managed with discipline.'
      }
    };
    return strategies[raceType];
  };

  const getPacingZones = (raceType) => {const zones = {
      'Sprint Triathlon': { swimCSS: 0.97, bikePower: 0.95, bikeHR: 0.88, runHR: 0.93, runPower: 1.10, runPace: 0.97, rpe: '8-9/10' },
      'Olympic Triathlon': { swimCSS: 0.93, bikePower: 0.92, bikeHR: 0.85, runHR: 0.89, runPower: 1.05, runPace: 0.93, rpe: '7-8/10' },
      'Half Ironman (70.3)': { swimCSS: 0.88, bikePower: 0.77, bikeHR: 0.75, runHR: 0.83, runPower: 0.90, runPace: 0.83, rpe: '6-7/10' },
      'Full Ironman (140.6)': { swimCSS: 0.83, bikePower: 0.70, bikeHR: 0.70, runHR: 0.76, runPower: 0.85, runPace: 0.77, rpe: '6/10' },
      'Custom Triathlon': { swimCSS: 0.93, bikePower: 0.92, bikeHR: 0.85, runHR: 0.89, runPower: 1.05, runPace: 0.93, rpe: '7-8/10' },
      '5K Run': { runHR: 0.96, runPower: 1.12, runPace: 1.03, rpe: '9/10' },
      '10K Run': { runHR: 0.93, runPower: 1.07, runPace: 0.98, rpe: '8/10' },
      'Half Marathon': { runHR: 0.89, runPower: 0.97, runPace: 0.90, rpe: '7/10' },
      'Full Marathon': { runHR: 0.86, runPower: 0.92, runPace: 0.87, rpe: '7/10' }
    };
    
    const result = zones[raceType];if (!result) {
      // Return Olympic as fallback to prevent crashreturn zones['Olympic Triathlon'];
    }
    
    return result;
  };

  const getAthleteThresholdPct = (athleteLevel) => {
    const thresholds = {
      'Recreational': 0.80,
      'Intermediate': 0.85,
      'Competitive': 0.90,
      'Elite': 0.95
    };
    return thresholds[athleteLevel] || 0.85; // Default to intermediate
  };

  const getTransitionTimes = (raceType) => {
    const transitions = {
      'Sprint Triathlon': { t1: 180, t2: 100 }, // 3:00, 1:40
      'Olympic Triathlon': { t1: 210, t2: 120 }, // 3:30, 2:00
      'Half Ironman (70.3)': { t1: 300, t2: 180 }, // 5:00, 3:00
      'Full Ironman (140.6)': { t1: 600, t2: 360 } // 10:00, 6:00
    };
    return transitions[raceType] || { t1: 180, t2: 120 };
  };

  const convertToMiles = (distance, unit) => {
    if (!distance || distance === '') return 0;
    const dist = parseFloat(distance);
    
    switch(unit) {
      case 'mi': return dist;
      case 'km': return dist * 0.621371;
      case 'm': return dist * 0.000621371;
      case 'yd': return dist * 0.000568182;
      default: return dist;
    }
  };

  const calculatePacing = () => {const race = raceTypes[formData.raceType];if (!race) {
      alert('ERROR: Race type not found: ' + formData.raceType);
      throw new Error('Race type not found: ' + formData.raceType);
    }
    
    const isTriathlon = race.type === 'triathlon';const zones = getPacingZones(formData.raceType);if (!zones) {
      alert('ERROR: No zones found for race type: ' + formData.raceType);
      throw new Error('No zones found for: ' + formData.raceType);
    }
    
    const strategy = getRaceStrategy(formData.raceType);if (!strategy) {
      alert('ERROR: No strategy found for race type: ' + formData.raceType);
      throw new Error('No strategy found for: ' + formData.raceType);
    }
    
    // Get athlete level threshold percentage (for fitness approach)
    const athleteThresholdPct = formData.pacingApproach === 'fitness' ? 
                                 getAthleteThresholdPct(formData.athleteLevel) : 
                                 0.85; // Default for target approach
    
    // Calculate or use provided HR values
    let maxHR = formData.maxHRKnown ? parseInt(formData.maxHR) : 
                calculateMaxHR(parseInt(formData.age), formData.gender, parseInt(formData.age) >= 40);
    
    let thresholdHR = formData.restingHRKnown ? 
                      calculateThresholdHR(maxHR, parseInt(formData.restingHR)) :
                      Math.round(maxHR * athleteThresholdPct);

    let result = {
      approach: formData.pacingApproach,
      raceType: formData.raceType,
      raceDistance: race.distance,
      raceWeight: formData.raceWeight,
      age: formData.age,
      gender: formData.gender,
      maxHR: maxHR,
      restingHR: formData.restingHR || 'Not provided',
      thresholdHR: thresholdHR,
      athleteLevel: formData.athleteLevel, // Store for display
      strategy: strategy,
      zones: zones
    };

    if (formData.pacingApproach === 'fitness') {
      if (isTriathlon) {
        // Calculate CSS using athlete level threshold
        let css = formData.cssKnown ? 
                  paceToSeconds(formData.css) :
                  paceToSeconds(formData.fastest100y) * athleteThresholdPct;
        
        result.css = secondsToPace(css);
        
        // Calculate FTP using athlete level threshold
        let ftp = formData.ftpKnown ?
                  parseInt(formData.ftp) :
                  Math.round(parseInt(formData.max20minWatts) * athleteThresholdPct);
        
        result.ftp = ftp;
        
        // Calculate run threshold using athlete level threshold
        // Threshold should be slower than 5K pace, so divide by threshold %
        let runThresholdPace = formData.thresholdPaceKnown ?
                               paceToSeconds(formData.thresholdPace) :
                               (timeToSeconds(formData.fastest5K) / 3.1) / athleteThresholdPct;
        
        result.runThresholdPace = secondsToPace(runThresholdPace);
        
        // Calculate segment distances
        const swimDistances = {
          'Sprint Triathlon': 0.5,
          'Olympic Triathlon': 0.93,
          'Half Ironman (70.3)': 1.2,
          'Full Ironman (140.6)': 2.4,
          'Custom Triathlon': convertToMiles(formData.customSwimDistance, formData.customSwimUnit)
        };
        const bikeDistances = {
          'Sprint Triathlon': 12.4,
          'Olympic Triathlon': 24.8,
          'Half Ironman (70.3)': 56,
          'Full Ironman (140.6)': 112,
          'Custom Triathlon': convertToMiles(formData.customBikeDistance, formData.customBikeUnit)
        };
        const runDistances = {
          'Sprint Triathlon': 3.1,
          'Olympic Triathlon': 6.2,
          'Half Ironman (70.3)': 13.1,
          'Full Ironman (140.6)': 26.2,
          'Custom Triathlon': convertToMiles(formData.customRunDistance, formData.customRunUnit)
        };
        
        // Swim pacing
        const swimPaceSeconds = css / zones.swimCSS;
        const swimDistanceYards = swimDistances[formData.raceType] * 1760; // miles to yards
        const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;
        
        result.swim = {
          targetPace: secondsToPace(swimPaceSeconds),
          estimatedTime: secondsToTime(swimTime),
          effort: zones.swimCSS >= 0.95 ? 'Hard' : zones.swimCSS >= 0.85 ? 'Moderate-Hard' : 'Moderate'
        };
        
        // Bike pacing - physics-based speed calculation
        const bikePower = ftp * zones.bikePower;
        const estimatedBikeSpeed = calculateBikeSpeed(bikePower, parseInt(formData.raceWeight), formData.raceType);
        const bikeTime = (bikeDistances[formData.raceType] / estimatedBikeSpeed) * 3600;
        
        result.bike = {
          targetPower: Math.round(bikePower),
          powerRange: `${Math.round(ftp * (zones.bikePower - 0.02))}-${Math.round(ftp * (zones.bikePower + 0.02))}W`,
          targetHR: Math.round(maxHR * zones.bikeHR),
          hrRange: `${Math.round(maxHR * (zones.bikeHR - 0.02))}-${Math.round(maxHR * (zones.bikeHR + 0.02))} bpm`,
          estimatedSpeed: Math.round(estimatedBikeSpeed * 10) / 10, // Round to 1 decimal
          estimatedTime: secondsToTime(bikeTime),
          effort: zones.bikePower >= 0.90 ? 'Hard' : zones.bikePower >= 0.75 ? 'Moderate-Hard' : 'Moderate'
        };
        
        // Run pacing
        const runPace = runThresholdPace / zones.runPace;
        const runTime = runPace * runDistances[formData.raceType];
        
        result.run = {
          targetHR: Math.round(maxHR * zones.runHR),
          hrRange: `${Math.round(maxHR * (zones.runHR - 0.02))}-${Math.round(maxHR * (zones.runHR + 0.02))} bpm`,
          targetPower: formData.thresholdPower ? Math.round(parseInt(formData.thresholdPower) * zones.runPower) + 'W' : 'N/A',
          estimatedPace: secondsToPace(runPace),
          paceRange: `${secondsToPace(runPace - 5)}-${secondsToPace(runPace + 5)}`,
          estimatedTime: secondsToTime(runTime),
          effort: zones.runHR >= 0.90 ? 'Very Hard' : zones.runHR >= 0.82 ? 'Hard' : 'Moderate-Hard'
        };
        
        // Total time (including transitions)
        const transitions = getTransitionTimes(formData.raceType);
        const t1Time = transitions.t1;
        const t2Time = transitions.t2;
        result.totalTime = secondsToTime(swimTime + t1Time + bikeTime + t2Time + runTime);
        
      } else {
        // Running race - threshold should be slower than 5K pace based on athlete level
        let runThresholdPace = formData.thresholdPaceKnown ?
                               paceToSeconds(formData.thresholdPace) :
                               (timeToSeconds(formData.fastest5K) / 3.1) / athleteThresholdPct;
        
        result.runThresholdPace = secondsToPace(runThresholdPace);
        
        const distance = parseFloat(race.distance.match(/[\d.]+/)[0]);
        const targetPace = runThresholdPace / zones.runPace;
        
        result.run = {
          targetHR: Math.round(maxHR * zones.runHR),
          hrRange: `${Math.round(maxHR * (zones.runHR - 0.02))}-${Math.round(maxHR * (zones.runHR + 0.02))} bpm`,
          targetPower: formData.thresholdPower ? Math.round(parseInt(formData.thresholdPower) * zones.runPower) + 'W' : 'N/A',
          targetPace: secondsToPace(targetPace),
          paceRange: `${secondsToPace(targetPace - 5)}-${secondsToPace(targetPace + 5)}`,
          estimatedTime: secondsToTime(targetPace * distance),
          effort: zones.runHR >= 0.95 ? 'Very Hard' : zones.runHR >= 0.88 ? 'Hard' : 'Moderate-Hard'
        };
      }
    } else if (formData.pacingApproach === 'target') {
      // TARGET TIME APPROACH
      const targetTimeSeconds = timeToSeconds(formData.targetTime);
      
      if (isTriathlon) {
        // Calculate segment distances
        const swimDistances = {
          'Sprint Triathlon': 0.5,
          'Olympic Triathlon': 0.93,
          'Half Ironman (70.3)': 1.2,
          'Full Ironman (140.6)': 2.4,
          'Custom Triathlon': convertToMiles(formData.customSwimDistance, formData.customSwimUnit)
        };
        const bikeDistances = {
          'Sprint Triathlon': 12.4,
          'Olympic Triathlon': 24.8,
          'Half Ironman (70.3)': 56,
          'Full Ironman (140.6)': 112,
          'Custom Triathlon': convertToMiles(formData.customBikeDistance, formData.customBikeUnit)
        };
        const runDistances = {
          'Sprint Triathlon': 3.1,
          'Olympic Triathlon': 6.2,
          'Half Ironman (70.3)': 13.1,
          'Full Ironman (140.6)': 26.2,
          'Custom Triathlon': convertToMiles(formData.customRunDistance, formData.customRunUnit)
        };
        
        // Estimate transition time
        const transitionTime = formData.raceType === 'Sprint Triathlon' ? 120 : 
                               formData.raceType === 'Olympic Triathlon' ? 180 : 
                               formData.raceType === 'Custom Triathlon' ? 240 : 300;
        
        // Available race time (minus transitions)
        const raceTimeSeconds = targetTimeSeconds - transitionTime;
        
        // Typical triathlon splits (as % of total race time)
        const splitPercentages = {
          'Sprint Triathlon': { swim: 0.15, bike: 0.50, run: 0.35 },
          'Olympic Triathlon': { swim: 0.13, bike: 0.52, run: 0.35 },
          'Half Ironman (70.3)': { swim: 0.10, bike: 0.55, run: 0.35 },
          'Full Ironman (140.6)': { swim: 0.09, bike: 0.55, run: 0.36 },
          'Custom Triathlon': { swim: 0.12, bike: 0.53, run: 0.35 }
        };
        
        const splits = splitPercentages[formData.raceType];
        
        // Calculate target segment times
        const swimTime = raceTimeSeconds * splits.swim;
        const bikeTime = raceTimeSeconds * splits.bike;
        const runTime = raceTimeSeconds * splits.run;
        const t1Time = transitionTime / 2; // Split transitions evenly
        const t2Time = transitionTime / 2;
        
        // Calculate required paces
        const swimDistanceYards = swimDistances[formData.raceType] * 1760;
        const swimPacePer100y = (swimTime / swimDistanceYards) * 100;
        
        // Bike - calculate required speed
        const requiredBikeSpeedMph = bikeDistances[formData.raceType] / (bikeTime / 3600);
        
        // Run - calculate required pace
        const requiredRunPace = runTime / runDistances[formData.raceType];
        
        // Swim
        result.swim = {
          targetTime: secondsToTime(swimTime),
          targetPace: secondsToPace(swimPacePer100y)
        };
        
        // T1
        result.t1 = {
          targetTime: secondsToTime(t1Time)
        };
        
        // Bike
        result.bike = {
          targetTime: secondsToTime(bikeTime),
          requiredSpeed: Math.round(requiredBikeSpeedMph * 10) / 10 // Round to 1 decimal
        };
        
        // T2
        result.t2 = {
          targetTime: secondsToTime(t2Time)
        };
        
        // Run
        result.run = {
          targetTime: secondsToTime(runTime),
          requiredPace: secondsToPace(requiredRunPace)
        };
        
        // Total time
        result.totalTime = formData.targetTime;
        
      } else {
        // Running race
        const distance = parseFloat(race.distance.match(/[\d.]+/)[0]);
        const requiredPace = targetTimeSeconds / distance;
        
        result.run = {
          targetTime: formData.targetTime,
          requiredPace: secondsToPace(requiredPace)
        };
      }
    }

    setResults(result);
  };

  const nextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3 && formData.pacingApproach === 'target') {
      setStep(5);
    } else if (step === 5 && formData.pacingApproach === 'target') {
      calculatePacing();
      setStep(6);
    } else if (step === 5 && formData.pacingApproach === 'fitness') {
      calculatePacing();
      setStep(6);
    } else {
      setStep(step + 1);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const calculateWhatIfTime = () => {
    if (!results || raceTypes[results.raceType].type !== 'triathlon' || results.approach !== 'fitness') {
      return results?.totalTime || '0:00:00';
    }

    const swimDistances = {
      'Sprint Triathlon': 0.5,
      'Olympic Triathlon': 0.93,
      'Half Ironman (70.3)': 1.2,
      'Full Ironman (140.6)': 2.4,
      'Custom Triathlon': convertToMiles(formData.customSwimDistance, formData.customSwimUnit)
    };
    const bikeDistances = {
      'Sprint Triathlon': 12.4,
      'Olympic Triathlon': 24.8,
      'Half Ironman (70.3)': 56,
      'Full Ironman (140.6)': 112,
      'Custom Triathlon': convertToMiles(formData.customBikeDistance, formData.customBikeUnit)
    };
    const runDistances = {
      'Sprint Triathlon': 3.1,
      'Olympic Triathlon': 6.2,
      'Half Ironman (70.3)': 13.1,
      'Full Ironman (140.6)': 26.2,
      'Custom Triathlon': convertToMiles(formData.customRunDistance, formData.customRunUnit)
    };

    const transitions = getTransitionTimes(results.raceType);

    // Calculate swim time
    const swimPaceSeconds = whatIf.swimPace || paceToSeconds(results.swim.targetPace);
    const swimDistanceYards = swimDistances[results.raceType] * 1760;
    const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;

    // Calculate T1
    const t1Time = whatIf.t1Time || transitions.t1;

    // Calculate bike time
    const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed;
    const bikeTime = (bikeDistances[results.raceType] / bikeSpeed) * 3600;

    // Calculate T2
    const t2Time = whatIf.t2Time || transitions.t2;

    // Calculate run time
    const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace);
    const runTime = runPace * runDistances[results.raceType];

    const totalSeconds = swimTime + t1Time + bikeTime + t2Time + runTime;
    return secondsToTime(totalSeconds);
  };

  const updateWhatIf = (field, value) => {
    setWhatIf(prev => ({ ...prev, [field]: value }));
  };

  const resetWhatIf = () => {
    setWhatIf({
      swimPace: null,
      t1Time: null,
      bikeSpeed: null,
      t2Time: null,
      runPace: null
    });
  };

  const exportToTextFile = () => {
    if (!results) return;

    const race = raceTypes[results.raceType];
    const isTriathlon = race.type === 'triathlon';
    
    let content = `KEYSTONE ENDURANCE - RACE PACING STRATEGY
${'='.repeat(60)}

RACE INFORMATION
${'-'.repeat(60)}
Race Type: ${results.raceType}
Distance: ${results.raceDistance}
Approach: ${results.approach === 'fitness' ? 'Current Fitness Based' : 'Target Time Based'}
${results.athleteLevel ? `Athlete Level: ${results.athleteLevel}` : ''}

ATHLETE PROFILE
${'-'.repeat(60)}
Age: ${results.age}
Gender: ${results.gender}
Race Weight: ${results.raceWeight} lbs
Max Heart Rate: ${results.maxHR} bpm
${results.restingHR !== 'Not provided' ? `Resting Heart Rate: ${results.restingHR} bpm` : ''}
Threshold Heart Rate: ${results.thresholdHR} bpm
`;

    if (isTriathlon) {
      content += `
TRIATHLON PACING STRATEGY
${'='.repeat(60)}

SWIM - CSS-Based Pacing
${'-'.repeat(60)}`;
      
      if (results.approach === 'fitness') {
        content += `
Target Pace: ${results.swim.targetPace}/100y
Estimated Time: ${results.swim.estimatedTime}
Effort Level: ${results.swim.effort}
CSS (Critical Swim Speed): ${results.css}

Strategy: ${results.strategy.swim}
`;
      } else {
        content += `
Target Time: ${results.swim.targetTime}
Required Pace: ${results.swim.targetPace}/100y
`;
      }

      const transitions = getTransitionTimes(results.raceType);
      content += `
T1 - SWIM TO BIKE TRANSITION
${'-'.repeat(60)}`;
      
      if (results.approach === 'target' && results.t1) {
        content += `
Target Time: ${results.t1.targetTime}
`;
      } else {
        content += `
Estimated Time: ${secondsToTime(transitions.t1)}
`;
      }
      
      content += `
Note: T1 transition from swimming to cycling (usually takes longer 
than T2). Time estimates may vary by athlete and race.

BIKE - POWER PRIMARY
${'-'.repeat(60)}`;
      
      if (results.approach === 'fitness') {
        content += `
Target Power: ${results.bike.targetPower}W (PRIMARY)
Power Range: ${results.bike.powerRange}
Target Heart Rate: ${results.bike.targetHR} bpm (Secondary)
HR Range: ${results.bike.hrRange}
Estimated Speed: ${results.bike.estimatedSpeed} mph
Estimated Time: ${results.bike.estimatedTime}
Effort Level: ${results.bike.effort}
FTP (Functional Threshold Power): ${results.ftp}W

Strategy: ${results.strategy.bike}
`;
      } else {
        content += `
Target Time: ${results.bike.targetTime}
Required Speed: ${results.bike.requiredSpeed} mph
`;
      }

      content += `
T2 - BIKE TO RUN TRANSITION
${'-'.repeat(60)}`;
      
      if (results.approach === 'target' && results.t2) {
        content += `
Target Time: ${results.t2.targetTime}
`;
      } else {
        content += `
Estimated Time: ${secondsToTime(transitions.t2)}
`;
      }
      
      content += `
Note: T2 transition from cycling to running. Time estimates may 
vary by athlete and race.

RUN - HR PRIMARY
${'-'.repeat(60)}`;
      
      if (results.approach === 'fitness') {
        content += `
Target Heart Rate: ${results.run.targetHR} bpm (PRIMARY)
HR Range: ${results.run.hrRange}
${results.run.targetPower !== 'N/A' ? `Target Power: ${results.run.targetPower} (If using Stryd)\n` : ''}Target Pace: ${results.run.estimatedPace}/mi
Pace Range: ${results.run.paceRange}
Estimated Time: ${results.run.estimatedTime}
Effort Level: ${results.run.effort}
Threshold Pace: ${results.runThresholdPace}

Strategy: ${results.strategy.run}
`;
      } else {
        content += `
Target Time: ${results.run.targetTime}
Required Pace: ${results.run.requiredPace}/mi
`;
      }

      content += `
TOTAL FINISH TIME
${'-'.repeat(60)}
${results.totalTime}
(Includes transitions)
`;
    } else {
      // Running race
      content += `
RUNNING RACE PACING STRATEGY
${'='.repeat(60)}
`;
      
      if (results.approach === 'fitness') {
        content += `
Target Heart Rate: ${results.run.targetHR} bpm (PRIMARY)
HR Range: ${results.run.hrRange}
${results.run.targetPower !== 'N/A' ? `Target Power: ${results.run.targetPower} (If using Stryd)\n` : ''}Target Pace: ${results.run.targetPace}/mi
Pace Range: ${results.run.paceRange}
Estimated Finish Time: ${results.run.estimatedTime}
Effort Level: ${results.run.effort}
RPE: ${results.zones.rpe}
Threshold Pace: ${results.runThresholdPace}

RACE STRATEGY
${'-'.repeat(60)}
${results.strategy.strategy}
`;
      } else {
        content += `
Goal Time: ${results.run.targetTime}
Required Pace: ${results.run.requiredPace}/mi
`;
      }
    }

    content += `
RACE EXECUTION GUIDANCE
${'='.repeat(60)}

PRIMARY MISTAKE TO AVOID
${'-'.repeat(60)}
${results.strategy.mistake}

KEY MINDSET
${'-'.repeat(60)}
${results.strategy.mindset}

THE KEYSTONE RULE
${'-'.repeat(60)}
Restraint early. Discipline in the middle. Execution late.

Most athletes reverse that order — and that's why they plateau.

${'='.repeat(60)}
Generated by Keystone Endurance Race Pacing Calculator
© 2026 Keystone Endurance | Coaching for Triathletes and Distance Runners

This calculator provides general pacing guidance. Always adjust based 
on race-day conditions and how you feel.

For personalized 1:1 coaching: coach@keystoneendurance.com
${'='.repeat(60)}
`;

    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${results.raceType.replace(/\s+/g, '_')}_Pacing_Strategy.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const prevStep = () => {
    if (step === 5 && formData.pacingApproach === 'target') {
      setStep(3); // Go back to approach selection
    } else {
      setStep(step - 1);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const startOver = () => {
    setStep(1);
    setFormData({
      raceCategory: '', raceType: '', pacingApproach: '', athleteLevel: '', currentWeight: '', raceWeight: '', age: '', gender: '',
      targetTime: '', maxHR: '', maxHRKnown: null, restingHR: '', restingHRKnown: null, thresholdHR: '',
      customSwimDistance: '', customSwimUnit: 'mi', customBikeDistance: '', customBikeUnit: 'mi', customRunDistance: '', customRunUnit: 'mi',
      thresholdPace: '', thresholdPaceKnown: null, fastest5K: '', thresholdPower: '',
      css: '', cssKnown: null, fastest100y: '', ftp: '', ftpKnown: null, max20minWatts: ''
    });
    setResults(null);
    resetWhatIf();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // Disable scroll wheel on number inputs (except custom distance fields)
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.target.type === 'number' && !e.target.classList.contains('keep-spinner')) {
        e.preventDefault();
      }
    };
    
    const handleFocus = (e) => {
      if (e.target.type === 'number' && !e.target.classList.contains('keep-spinner')) {
        // Blur on scroll to prevent accidental changes
        const preventScroll = (scrollEvent) => {
          if (document.activeElement === e.target) {
            e.target.blur();
          }
        };
        window.addEventListener('wheel', preventScroll, { passive: true, once: true });
      }
    };
    
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('focus', handleFocus, true);
    
    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.charcoal} 100%)`, fontFamily: 'Inter, sans-serif', padding: '20px 10px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        body { 
          overflow-x: hidden; 
          max-width: 100vw;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .card-enter { animation: slideIn 0.5s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        input, select, button { 
          font-family: 'Inter', sans-serif;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          border-radius: 8px;
          box-sizing: border-box;
        }
        input, select {
          font-size: 16px !important; /* Prevents iOS zoom on focus */
          touch-action: manipulation;
        }
        button {
          touch-action: manipulation;
          cursor: pointer;
        }
        
        /* Hide number input spinners (except custom distances) */
        input[type="number"]:not(.keep-spinner)::-webkit-outer-spin-button,
        input[type="number"]:not(.keep-spinner)::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"]:not(.keep-spinner) {
          -moz-appearance: textfield;
        }
        
        /* Range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 5px;
          background: #ddd;
          outline: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #D62027;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #D62027;
          cursor: pointer;
          border: none;
        }
        
        /* Race distance grid - responsive */
        .race-distance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        
        /* Custom distances grid - responsive */
        .custom-distances-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          max-width: 100%;
        }
        
        /* Action buttons grid */
        .action-buttons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        /* Medium screens - reduce gap */
        @media (max-width: 900px) {
          .custom-distances-grid {
            gap: 3px;
          }
        }
        
        /* Tablets and small laptops */
        @media (max-width: 768px) {
          h1 { font-size: 28px !important; letter-spacing: 1px !important; }
          h2 { font-size: 20px !important; }
          .logo-text { font-size: 48px !important; letter-spacing: 1px !important; }
          .logo-subtext { font-size: 16px !important; letter-spacing: 4px !important; }
          .race-distance-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .custom-distances-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .action-buttons-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        /* Large phones (iPhone 14 Pro Max, large Androids) */
        @media (max-width: 430px) {
          h1 { font-size: 26px !important; }
          h2 { font-size: 19px !important; }
          .logo-text { font-size: 44px !important; }
          .logo-subtext { font-size: 15px !important; letter-spacing: 3px !important; }
          button { font-size: 15px !important; padding: 14px !important; }
          .race-distance-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        /* Standard phones (iPhone 12/13/14, mid Androids) */
        @media (max-width: 390px) {
          h1 { font-size: 24px !important; }
          h2 { font-size: 18px !important; }
          .logo-text { font-size: 40px !important; }
          .logo-subtext { font-size: 14px !important; letter-spacing: 2px !important; }
          button { font-size: 14px !important; padding: 13px !important; }
        }
        
        /* Older/smaller phones (iPhone 6/7/8/SE, small Androids) */
        @media (max-width: 375px) {
          h1 { font-size: 22px !important; }
          h2 { font-size: 17px !important; }
          .logo-text { font-size: 38px !important; }
          .logo-subtext { font-size: 13px !important; letter-spacing: 2px !important; }
          button { font-size: 13px !important; padding: 12px !important; }
        }
        
        /* Very small phones (iPhone 5/SE 1st gen, very small Androids) */
        @media (max-width: 320px) {
          h1 { font-size: 20px !important; }
          h2 { font-size: 16px !important; }
          .logo-text { font-size: 34px !important; }
          .logo-subtext { font-size: 12px !important; letter-spacing: 1px !important; }
          button { font-size: 12px !important; padding: 10px !important; }
        }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 10px' }}>
        {/* Header - Mobile Optimized */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="logo-text" style={{ fontSize: '60px', fontWeight: '900', color: colors.primary, letterSpacing: '2px', marginBottom: '8px', textShadow: '0 4px 12px rgba(214, 32, 39, 0.5)', wordBreak: 'break-word' }}>
            KEYSTONE
          </div>
          <div className="logo-subtext" style={{ fontSize: '20px', fontWeight: '300', color: 'white', letterSpacing: '6px', wordBreak: 'break-word' }}>
            ENDURANCE
          </div>
          <div style={{ height: '3px', width: '100px', background: colors.primary, margin: '20px auto' }} />
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'white', marginTop: '20px', lineHeight: '1.3', padding: '0 10px' }}>
            Race Pacing Strategy Calculator
          </div>
          <div style={{ fontSize: '15px', color: 'white', opacity: 0.8, marginTop: '10px', padding: '0 10px' }}>
            Optimize Your Race-Day Execution
          </div>
        </div>

        {/* Step 1: Race Selection - Will continue in next part */}
        {/* Step 1: Race Category Selection */}
        {step === 1 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <div key={dot} style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: dot === 1 ? colors.primary : '#ddd' 
                  }} />
                ))}
              </div>

              <h2 style={{ fontSize: '28px', marginBottom: '30px', color: colors.charcoal, fontWeight: '700', textAlign: 'left' }}>
                Step 1: Choose Your Race Type
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => updateFormData('raceCategory', 'triathlon')}
                  style={{
                    padding: '40px 20px',
                    border: `3px solid ${formData.raceCategory === 'triathlon' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.raceCategory === 'triathlon' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.raceCategory === 'triathlon' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '24px', color: colors.charcoal, marginBottom: '8px' }}>
                    Triathlon
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', lineHeight: '1.4' }}>
                    Swim, Bike, Run
                  </div>
                </div>

                <div
                  onClick={() => updateFormData('raceCategory', 'running')}
                  style={{
                    padding: '40px 20px',
                    border: `3px solid ${formData.raceCategory === 'running' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.raceCategory === 'running' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.raceCategory === 'running' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '24px', color: colors.charcoal, marginBottom: '8px' }}>
                    Running Race
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', lineHeight: '1.4' }}>
                    5K, 10K, Half, Full
                  </div>
                </div>
              </div>

              {/* Email Input */}
              <div style={{ marginTop: '30px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                  Email Address <span style={{ color: colors.primary }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    border: `2px solid ${formData.email && !isValidEmail(formData.email) ? colors.primary : '#ddd'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                {formData.email && !isValidEmail(formData.email) && (
                  <div style={{ fontSize: '13px', color: colors.primary, marginTop: '6px' }}>
                    Please enter a valid email address
                  </div>
                )}
              </div>

              <button
                onClick={nextStep}
                disabled={!formData.raceCategory || !formData.email || !isValidEmail(formData.email)}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: (formData.raceCategory && formData.email && isValidEmail(formData.email)) ? colors.primary : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (formData.raceCategory && formData.email && isValidEmail(formData.email)) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: (formData.raceCategory && formData.email && isValidEmail(formData.email)) ? `0 6px 20px ${colors.primary}60` : 'none',
                  letterSpacing: '0.5px'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Distance Selection */}
        {step === 2 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}`, overflowX: 'hidden' }}>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <div key={dot} style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: dot < 2 ? colors.maroon : dot === 2 ? colors.primary : '#ddd' 
                  }} />
                ))}
              </div>

              <h2 style={{ fontSize: '28px', marginBottom: '30px', color: colors.charcoal, fontWeight: '700', textAlign: 'left' }}>
                Step 2: Choose Distance
              </h2>

              {formData.raceCategory === 'triathlon' && (
                <>
                  <div className="race-distance-grid" style={{ marginBottom: '30px' }}>
                    {[
                      { name: 'Sprint', swim: '0.47', bike: '12.4', run: '3.1' },
                      { name: 'Olympic', swim: '0.93', bike: '24.8', run: '6.2' },
                      { name: 'Half Ironman', swim: '1.20', bike: '56.0', run: '13.1' },
                      { name: 'Ironman', swim: '2.40', bike: '112.0', run: '26.2' }
                    ].map(race => (
                      <div
                        key={race.name}
                        onClick={() => {
                          const raceTypeMap = {
                            'Sprint': 'Sprint Triathlon',
                            'Olympic': 'Olympic Triathlon',
                            'Half Ironman': 'Half Ironman (70.3)',
                            'Ironman': 'Full Ironman (140.6)'
                          };
                          updateFormData('raceType', raceTypeMap[race.name]);
                          // Auto-populate custom distances
                          updateFormData('customSwimDistance', race.swim);
                          updateFormData('customBikeDistance', race.bike);
                          updateFormData('customRunDistance', race.run);
                        }}
                        style={{
                          padding: '20px 15px',
                          border: `2px solid ${
                            (formData.raceType === 'Sprint Triathlon' && race.name === 'Sprint') ||
                            (formData.raceType === 'Olympic Triathlon' && race.name === 'Olympic') ||
                            (formData.raceType === 'Half Ironman (70.3)' && race.name === 'Half Ironman') ||
                            (formData.raceType === 'Full Ironman (140.6)' && race.name === 'Ironman')
                            ? colors.charcoal : '#ddd'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: 'white',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: '700', fontSize: '18px', color: colors.charcoal, marginBottom: '8px' }}>
                          {race.name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {race.swim}/{race.bike}/{race.run}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Distances */}
                  <div style={{ marginTop: '30px', padding: '10px 12px', background: '#f8f8f8', borderRadius: '12px', maxWidth: '100%', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '15px', color: colors.charcoal, marginBottom: '8px', fontWeight: '700', textAlign: 'center' }}>
                      Custom Distances
                    </h3>
                    
                    <div className="custom-distances-grid">
                      {/* Swimming */}
                      <div style={{ minWidth: '0' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: colors.charcoal, marginBottom: '4px' }}>
                          Swimming
                        </label>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input
                            type="number"
                            step="0.01"
                            className="keep-spinner"
                            value={formData.customSwimDistance}
                            onChange={(e) => {
                              updateFormData('customSwimDistance', e.target.value);
                              if (e.target.value) updateFormData('raceType', 'Custom Triathlon');
                            }}
                            placeholder="2.40"
                            style={{ flex: 1, padding: '5px 6px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', minWidth: '0', width: '100%' }}
                          />
                          <select
                            value={formData.customSwimUnit}
                            onChange={(e) => updateFormData('customSwimUnit', e.target.value)}
                            style={{ padding: '5px 3px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', width: '45px', flexShrink: 0 }}
                          >
                            <option value="mi">mi</option>
                            <option value="km">km</option>
                            <option value="m">m</option>
                            <option value="yd">yd</option>
                          </select>
                        </div>
                      </div>

                      {/* Cycling */}
                      <div style={{ minWidth: '0' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: colors.charcoal, marginBottom: '4px' }}>
                          Cycling
                        </label>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input
                            type="number"
                            step="0.1"
                            className="keep-spinner"
                            value={formData.customBikeDistance}
                            onChange={(e) => {
                              updateFormData('customBikeDistance', e.target.value);
                              if (e.target.value) updateFormData('raceType', 'Custom Triathlon');
                            }}
                            placeholder="112.0"
                            style={{ flex: 1, padding: '5px 6px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', minWidth: '0', width: '100%' }}
                          />
                          <select
                            value={formData.customBikeUnit}
                            onChange={(e) => updateFormData('customBikeUnit', e.target.value)}
                            style={{ padding: '5px 3px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', width: '45px', flexShrink: 0 }}
                          >
                            <option value="mi">mi</option>
                            <option value="km">km</option>
                          </select>
                        </div>
                      </div>

                      {/* Running */}
                      <div style={{ minWidth: '0' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: colors.charcoal, marginBottom: '4px' }}>
                          Running
                        </label>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input
                            type="number"
                            step="0.1"
                            className="keep-spinner"
                            value={formData.customRunDistance}
                            onChange={(e) => {
                              updateFormData('customRunDistance', e.target.value);
                              if (e.target.value) updateFormData('raceType', 'Custom Triathlon');
                            }}
                            placeholder="26.2"
                            style={{ flex: 1, padding: '5px 6px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', minWidth: '0', width: '100%' }}
                          />
                          <select
                            value={formData.customRunUnit}
                            onChange={(e) => updateFormData('customRunUnit', e.target.value)}
                            style={{ padding: '5px 3px', fontSize: '11px', border: '2px solid #ddd', borderRadius: '5px', width: '45px', flexShrink: 0 }}
                          >
                            <option value="mi">mi</option>
                            <option value="km">km</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {formData.raceCategory === 'running' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {['5K Run', '10K Run', 'Half Marathon', 'Full Marathon'].map(race => (
                    <div
                      key={race}
                      onClick={() => updateFormData('raceType', race)}
                      style={{
                        padding: '30px 20px',
                        border: `3px solid ${formData.raceType === race ? colors.primary : '#ddd'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: formData.raceType === race ? `${colors.primary}10` : 'white',
                        boxShadow: formData.raceType === race ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: '700', fontSize: '20px', color: colors.charcoal, marginBottom: '4px' }}>
                        {race.replace(' Run', '')}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {raceTypes[race].distance}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button
                  onClick={prevStep}
                  style={{
                    flex: 1,
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    background: 'white',
                    color: colors.charcoal,
                    border: `2px solid ${colors.charcoal}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.raceType}
                  style={{
                    flex: 2,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: formData.raceType ? colors.primary : '#cccccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: formData.raceType ? 'pointer' : 'not-allowed',
                    boxShadow: formData.raceType ? `0 6px 20px ${colors.primary}60` : 'none',
                    letterSpacing: '0.5px'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Approach Selection */}
        {step === 3 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <div key={dot} style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: dot < 3 ? colors.maroon : dot === 3 ? colors.primary : '#ddd' 
                  }} />
                ))}
              </div>

              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 3: CHOOSE YOUR APPROACH
              </h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div
                  onClick={() => updateFormData('pacingApproach', 'target')}
                  style={{
                    padding: '25px 20px',
                    border: `3px solid ${formData.pacingApproach === 'target' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.pacingApproach === 'target' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.pacingApproach === 'target' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '20px', color: colors.charcoal, marginBottom: '8px' }}>
                    TARGET TIME
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    I have a specific goal time in mind (e.g., BQ attempt, sub-4 hour marathon, Kona qualification)
                  </div>
                </div>
                
                <div
                  onClick={() => updateFormData('pacingApproach', 'fitness')}
                  style={{
                    padding: '25px 20px',
                    border: `3px solid ${formData.pacingApproach === 'fitness' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.pacingApproach === 'fitness' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.pacingApproach === 'fitness' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '20px', color: colors.charcoal, marginBottom: '8px' }}>
                    CURRENT FITNESS
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    Base it on my current fitness level and metrics (best for realistic, sustainable pacing)
                  </div>
                </div>
              </div>
              
              {/* Athlete Level Selection - Only for Current Fitness */}
              {formData.pacingApproach === 'fitness' && (
                <div style={{ marginTop: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', color: colors.charcoal, fontWeight: '700' }}>
                    YOUR ATHLETE LEVEL
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
                    This helps us adjust your threshold calculations to match your training experience
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { 
                        level: 'Recreational',
                        desc: 'Training 3-6 hours/week, racing for fun and fitness',
                        pct: '80%'
                      },
                      { 
                        level: 'Intermediate',
                        desc: 'Training 6-10 hours/week, focused on improvement',
                        pct: '85%'
                      },
                      { 
                        level: 'Competitive',
                        desc: 'Training 10-15 hours/week, age group podium contender',
                        pct: '90%'
                      },
                      { 
                        level: 'Elite',
                        desc: 'Training 15+ hours/week, pro or top age grouper',
                        pct: '95%'
                      }
                    ].map(({level, desc, pct}) => (
                      <div
                        key={level}
                        onClick={() => updateFormData('athleteLevel', level)}
                        style={{
                          padding: '15px',
                          border: `2px solid ${formData.athleteLevel === level ? colors.primary : '#ddd'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: formData.athleteLevel === level ? 'white' : '#f9f9f9',
                          boxShadow: formData.athleteLevel === level ? `0 2px 8px ${colors.primary}40` : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: colors.charcoal }}>
                            {level}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.primary, background: `${colors.primary}15`, padding: '3px 8px', borderRadius: '4px' }}>
                            {pct} threshold
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                          {desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button
                  onClick={prevStep}
                  style={{
                    flex: 1,
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    background: 'white',
                    color: colors.charcoal,
                    border: `2px solid ${colors.charcoal}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  ← BACK
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.pacingApproach || (formData.pacingApproach === 'fitness' && !formData.athleteLevel)}
                  style={{
                    flex: 2,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? colors.primary : '#cccccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? 'pointer' : 'not-allowed',
                    boxShadow: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? `0 6px 20px ${colors.primary}60` : 'none',
                    letterSpacing: '0.5px'
                  }}
                >
                  CONTINUE →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Body Stats */}
        {step === 4 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <div key={dot} style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: dot < 4 ? colors.maroon : dot === 4 ? colors.primary : '#ddd' 
                  }} />
                ))}
              </div>

              <h2 style={{ fontSize: '24px', marginBottom: '25px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 4: BODY STATS
              </h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Current Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={formData.currentWeight}
                    onChange={(e) => updateFormData('currentWeight', e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="e.g., 170"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Race Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={formData.raceWeight}
                    onChange={(e) => updateFormData('raceWeight', e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="e.g., 165"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                    All calculations will be based on race weight
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => updateFormData('age', e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="e.g., 35"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Gender
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {['male', 'female'].map(gender => (
                      <div
                        key={gender}
                        onClick={() => updateFormData('gender', gender)}
                        style={{
                          padding: '14px',
                          border: `2px solid ${formData.gender === gender ? colors.primary : '#ddd'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '16px',
                          background: formData.gender === gender ? `${colors.primary}10` : 'white',
                          color: colors.charcoal,
                          transition: 'all 0.2s'
                        }}
                      >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={() => {nextStep();
                  }}
                  disabled={!formData.currentWeight || !formData.raceWeight || !formData.age || !formData.gender}
                  style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? colors.primary : '#cccccc', color: 'white', border: 'none', borderRadius: '12px', cursor: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? 'pointer' : 'not-allowed', boxShadow: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? `0 6px 20px ${colors.primary}60` : 'none', letterSpacing: '0.5px' }}
                >
                  CONTINUE →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Target Time Input */}
        {step === 5 && formData.pacingApproach === 'target' && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h2 style={{ fontSize: '24px', marginBottom: '25px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 5: YOUR GOAL TIME
              </h2>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: colors.charcoal, marginBottom: '12px', textAlign: 'center' }}>
                  What's your target finish time?
                </label>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <input
                    type="text"
                    value={formData.targetTime}
                    onChange={(e) => updateFormData('targetTime', e.target.value)}
                    placeholder="HH:MM:SS (e.g., 3:45:00)"
                    style={{ 
                      width: '100%',
                      maxWidth: '300px',
                      padding: '18px',
                      fontSize: '24px',
                      fontWeight: '700',
                      border: `3px solid ${colors.primary}`,
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                  {raceTypes[formData.raceType].type === 'triathlon' ? 
                    'Enter total race time (swim + bike + run + transitions)' :
                    'Enter your goal finish time'
                  }
                </div>
              </div>

              <div style={{ background: `${colors.primary}08`, padding: '15px', borderRadius: '12px', marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontWeight: '700', fontSize: '15px', color: colors.charcoal, marginBottom: '8px' }}>
                  Common Goal Times:
                </div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
                  {formData.raceType === '5K Run' && (
                    <>
                      <div>• Sub-30:00 (recreational)</div>
                      <div>• Sub-25:00 (intermediate)</div>
                      <div>• Sub-20:00 (competitive)</div>
                      <div>• Sub-18:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === '10K Run' && (
                    <>
                      <div>• Sub-1:00:00 (recreational)</div>
                      <div>• Sub-50:00 (intermediate)</div>
                      <div>• Sub-45:00 (competitive)</div>
                      <div>• Sub-40:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === 'Full Marathon' && (
                    <>
                      <div>• Boston Qualifier (varies by age/gender): 2:55:00 - 4:55:00</div>
                      <div>• Sub-4:00:00 (common goal)</div>
                      <div>• Sub-3:30:00 (competitive)</div>
                      <div>• Sub-3:00:00 (elite)</div>
                    </>
                  )}
                  {formData.raceType === 'Half Marathon' && (
                    <>
                      <div>• Sub-2:00:00 (common goal)</div>
                      <div>• Sub-1:45:00 (competitive)</div>
                      <div>• Sub-1:30:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === 'Sprint Triathlon' && (
                    <>
                      <div>• Sub-1:30:00 (recreational)</div>
                      <div>• Sub-1:15:00 (intermediate)</div>
                      <div>• Sub-1:05:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Olympic Triathlon' && (
                    <>
                      <div>• Sub-3:00:00 (recreational)</div>
                      <div>• Sub-2:30:00 (intermediate)</div>
                      <div>• Sub-2:15:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Full Ironman (140.6)' && (
                    <>
                      <div>• Kona Qualifier: 8:00:00 - 11:00:00 (varies by age/gender)</div>
                      <div>• Sub-12:00:00 (finish)</div>
                      <div>• Sub-10:00:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Half Ironman (70.3)' && (
                    <>
                      <div>• Sub-6:00:00 (common goal)</div>
                      <div>• Sub-5:00:00 (competitive)</div>
                      <div>• Sub-4:30:00 (advanced)</div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={() => {nextStep();
                  }}
                  disabled={!formData.targetTime}
                  style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: formData.targetTime ? colors.primary : '#cccccc', color: 'white', border: 'none', borderRadius: '12px', cursor: formData.targetTime ? 'pointer' : 'not-allowed', boxShadow: formData.targetTime ? `0 6px 20px ${colors.primary}60` : 'none', letterSpacing: '0.5px' }}
                >
                  GET MY STRATEGY →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Fitness Metrics */}
        {step === 5 && formData.pacingApproach === 'fitness' && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}`, maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 5: FITNESS METRICS
              </h2>
              
              {/* Max HR */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  Max Heart Rate
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Max HR?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No - Calculate it' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('maxHRKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.maxHRKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.maxHRKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.maxHRKnown === true && (
                  <input type="number" value={formData.maxHR} onChange={(e) => updateFormData('maxHR', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 185" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
                {formData.maxHRKnown === false && (
                  <div style={{ padding: '12px', background: 'white', borderRadius: '8px', fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Will calculate based on age and gender
                  </div>
                )}
              </div>

              {/* Resting HR */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  Resting Heart Rate (for better threshold calculation)
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Resting HR?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('restingHRKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.restingHRKnown === opt.val ? colors.maroon : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.restingHRKnown === opt.val ? `${colors.maroon}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.restingHRKnown === true && (
                  <input type="number" value={formData.restingHR} onChange={(e) => updateFormData('restingHR', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 55" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
              </div>

              {/* TRIATHLON SPECIFIC */}
              {raceTypes[formData.raceType].type === 'triathlon' && (
                <>
                  {/* Swim CSS */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: '2px solid #e3f2fd' }}>
                    <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                      SWIM: Critical Swim Speed (CSS)
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                        Do you know your CSS?
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                        {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                          <div key={opt.label} onClick={() => updateFormData('cssKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.cssKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.cssKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.cssKnown === true && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>CSS (MM:SS per 100 yards)</label>
                        <input type="text" value={formData.css} onChange={(e) => updateFormData('css', e.target.value)} placeholder="e.g., 1:30" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.cssKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's your fastest 100-yard swim time? (MM:SS)</label>
                        <input type="text" value={formData.fastest100y} onChange={(e) => updateFormData('fastest100y', e.target.value)} placeholder="e.g., 1:45" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                          We'll calculate CSS as 85% of your fastest 100y time
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bike FTP */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px', border: '2px solid #fff3e0' }}>
                    <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                      BIKE: Functional Threshold Power (FTP)
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                        Do you know your FTP?
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                        {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                          <div key={opt.label} onClick={() => updateFormData('ftpKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.ftpKnown === opt.val ? colors.maroon : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.ftpKnown === opt.val ? `${colors.maroon}10` : 'white', transition: 'all 0.2s' }}>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.ftpKnown === true && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>FTP (watts)</label>
                        <input type="number" value={formData.ftp} onChange={(e) => updateFormData('ftp', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 250" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.ftpKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Maximum watts you can hold for 20 minutes</label>
                        <input type="number" value={formData.max20minWatts} onChange={(e) => updateFormData('max20minWatts', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 270" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                          We'll calculate FTP as 85% of your 20-minute max
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* RUN Threshold Pace (for all) */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: '2px solid #e8f5e9' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  RUN: Threshold Pace
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Threshold Pace?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('thresholdPaceKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.thresholdPaceKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.thresholdPaceKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.thresholdPaceKnown === true && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Threshold Pace (MM:SS per mile)</label>
                    <input type="text" value={formData.thresholdPace} onChange={(e) => updateFormData('thresholdPace', e.target.value)} placeholder="e.g., 8:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                  </div>
                )}
                {formData.thresholdPaceKnown === false && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's the fastest 5K you can run today? (MM:SS)</label>
                    <input type="text" value={formData.fastest5K} onChange={(e) => updateFormData('fastest5K', e.target.value)} placeholder="e.g., 24:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                      We'll calculate threshold pace (should be ~10% slower than 5K pace)
                    </div>
                  </div>
                )}
              </div>

              {/* Optional: Run Power */}
              <div style={{ marginBottom: '25px', padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '8px' }}>
                  RUN: Threshold Power (Optional - Stryd users)
                </div>
                <input type="number" value={formData.thresholdPower} onChange={(e) => updateFormData('thresholdPower', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 285 (leave blank if no Stryd)" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={() => {nextStep();
                  }}
                  disabled={
                    formData.maxHRKnown === null ||
                    (formData.maxHRKnown && !formData.maxHR) ||
                    formData.restingHRKnown === null ||
                    (raceTypes[formData.raceType].type === 'triathlon' && (
                      formData.cssKnown === null ||
                      (formData.cssKnown && !formData.css) ||
                      (!formData.cssKnown && !formData.fastest100y) ||
                      formData.ftpKnown === null ||
                      (formData.ftpKnown && !formData.ftp) ||
                      (!formData.ftpKnown && !formData.max20minWatts)
                    )) ||
                    formData.thresholdPaceKnown === null ||
                    (formData.thresholdPaceKnown && !formData.thresholdPace) ||
                    (!formData.thresholdPaceKnown && !formData.fastest5K)
                  }
                  style={{ 
                    flex: 2, 
                    padding: '16px', 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    background: (
                      formData.maxHRKnown === null ||
                      (formData.maxHRKnown && !formData.maxHR) ||
                      formData.restingHRKnown === null ||
                      (raceTypes[formData.raceType].type === 'triathlon' && (
                        formData.cssKnown === null ||
                        (formData.cssKnown && !formData.css) ||
                        (!formData.cssKnown && !formData.fastest100y) ||
                        formData.ftpKnown === null ||
                        (formData.ftpKnown && !formData.ftp) ||
                        (!formData.ftpKnown && !formData.max20minWatts)
                      )) ||
                      formData.thresholdPaceKnown === null ||
                      (formData.thresholdPaceKnown && !formData.thresholdPace) ||
                      (!formData.thresholdPaceKnown && !formData.fastest5K)
                    ) ? '#cccccc' : colors.primary,
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    cursor: (
                      formData.maxHRKnown === null ||
                      (formData.maxHRKnown && !formData.maxHR) ||
                      formData.restingHRKnown === null ||
                      (raceTypes[formData.raceType].type === 'triathlon' && (
                        formData.cssKnown === null ||
                        (formData.cssKnown && !formData.css) ||
                        (!formData.cssKnown && !formData.fastest100y) ||
                        formData.ftpKnown === null ||
                        (formData.ftpKnown && !formData.ftp) ||
                        (!formData.ftpKnown && !formData.max20minWatts)
                      )) ||
                      formData.thresholdPaceKnown === null ||
                      (formData.thresholdPaceKnown && !formData.thresholdPace) ||
                      (!formData.thresholdPaceKnown && !formData.fastest5K)
                    ) ? 'not-allowed' : 'pointer',
                    boxShadow: (
                      formData.maxHRKnown === null ||
                      (formData.maxHRKnown && !formData.maxHR) ||
                      formData.restingHRKnown === null ||
                      (raceTypes[formData.raceType].type === 'triathlon' && (
                        formData.cssKnown === null ||
                        (formData.cssKnown && !formData.css) ||
                        (!formData.cssKnown && !formData.fastest100y) ||
                        formData.ftpKnown === null ||
                        (formData.ftpKnown && !formData.ftp) ||
                        (!formData.ftpKnown && !formData.max20minWatts)
                      )) ||
                      formData.thresholdPaceKnown === null ||
                      (formData.thresholdPaceKnown && !formData.thresholdPace) ||
                      (!formData.thresholdPaceKnown && !formData.fastest5K)
                    ) ? 'none' : `0 6px 20px ${colors.primary}60`,
                    letterSpacing: '0.5px' 
                  }}
                >
                  GET MY STRATEGY →
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 6: Results */}
        {step === 6 && results && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '25px 15px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
                {[1, 2, 3, 4, 5].map(dot => (
                  <div key={dot} style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: colors.maroon
                  }} />
                ))}
              </div>

              <h1 style={{ fontSize: '32px', margin: '0 0 15px 0', color: colors.charcoal, letterSpacing: '0.5px', fontWeight: '800', textAlign: 'center', lineHeight: '1.2' }}>
                YOUR RACE PACING STRATEGY
              </h1>
              <p style={{ fontSize: '18px', color: colors.charcoal, fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
                {results.raceType}
              </p>
              <p style={{ fontSize: '15px', color: '#666', marginBottom: '25px', textAlign: 'center' }}>
                {results.raceDistance}
              </p>

              {/* Athlete Metrics Summary - Only show for FITNESS approach */}
              {results.approach === 'fitness' && (
                <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.charcoal}08`, borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                    YOUR METRICS
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: colors.charcoal }}>
                    <div><strong>Athlete Level:</strong> {results.athleteLevel} ({getAthleteThresholdPct(results.athleteLevel) * 100}% threshold)</div>
                    <div>Race Weight: {results.raceWeight} lbs</div>
                    <div>Age: {results.age} ({results.gender})</div>
                    <div>Max HR: {results.maxHR} bpm</div>
                    <div>Resting HR: {results.restingHR}</div>
                    <div>Threshold HR: {results.thresholdHR} bpm</div>
                    {results.css && <div>CSS: {results.css}/100y</div>}
                    {results.ftp && <div>FTP: {results.ftp}W</div>}
                    {results.runThresholdPace && <div>Run Threshold Pace: {results.runThresholdPace}/mile</div>}
                  </div>
                </div>
              )}

              {/* TRIATHLON RESULTS */}
              {raceTypes[results.raceType].type === 'triathlon' && (
                <>
                  {/* SWIM */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      SWIM {results.approach === 'fitness' ? '- CSS-Based Pacing' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                          {results.approach === 'target' ? 'Target Time' : 'Estimated Time'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>
                          {results.approach === 'target' ? results.swim.targetTime : results.swim.estimatedTime}
                        </div>
                      </div>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                          {results.approach === 'target' ? 'Required' : 'Target'} Pace
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.swim.targetPace}/100y</div>
                      </div>
                      {results.approach === 'fitness' && (
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Effort</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: colors.charcoal }}>{results.swim.effort}</div>
                        </div>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.swim}
                      </div>
                    )}
                  </div>

                  {/* T1 - Swim to Bike Transition */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '12px', border: '2px solid #ddd' }}>
                    <h2 style={{ fontSize: '20px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      T1 (Swim-to-Bike Transition)
                    </h2>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                        {results.approach === 'target' && results.t1 ? 'Target Time' : 'Estimated Time'}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>
                        {results.approach === 'target' && results.t1 
                          ? results.t1.targetTime 
                          : secondsToTime(getTransitionTimes(results.raceType).t1)}
                      </div>
                    </div>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                      <strong>Note:</strong> T1 transition from swimming to cycling (usually takes longer than T2). Time estimates may vary by athlete and race.
                    </div>
                  </div>

                  {/* BIKE */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px', border: `2px solid ${colors.maroon}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.maroon, marginBottom: '15px', fontWeight: '700' }}>
                      BIKE {results.approach === 'fitness' ? '- POWER PRIMARY' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                      {results.approach === 'fitness' ? (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Power (PRIMARY)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.targetPower}W</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Range: {results.bike.powerRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (Secondary)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.bike.targetHR} bpm</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.bike.hrRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Speed</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.estimatedSpeed} mph</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.estimatedTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.targetTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Speed</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.bike.requiredSpeed} mph</div>
                          </div>
                        </>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.bike}
                      </div>
                    )}
                  </div>

                  {/* T2 - Bike to Run Transition */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '12px', border: '2px solid #ddd' }}>
                    <h2 style={{ fontSize: '20px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      T2 (Bike-to-Run Transition)
                    </h2>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                        {results.approach === 'target' && results.t2 ? 'Target Time' : 'Estimated Time'}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>
                        {results.approach === 'target' && results.t2 
                          ? results.t2.targetTime 
                          : secondsToTime(getTransitionTimes(results.raceType).t2)}
                      </div>
                    </div>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                      <strong>Note:</strong> T2 transition from cycling to running. Time estimates may vary by athlete and race.
                    </div>
                  </div>

                  {/* RUN */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      RUN {results.approach === 'fitness' ? '- HR PRIMARY' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                      {results.approach === 'fitness' ? (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (PRIMARY)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetHR} bpm</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.hrRange}</div>
                          </div>
                          {results.run.targetPower !== 'N/A' && (
                            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                              <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Power (If Stryd)</div>
                              <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPower}</div>
                            </div>
                          )}
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Est. Pace</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.estimatedPace}/mi</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.paceRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.estimatedTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Pace</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.requiredPace}/mi</div>
                          </div>
                        </>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.run}
                      </div>
                    )}
                  </div>

                  {/* TOTAL FINISH TIME */}
                  <div style={{ marginBottom: '30px', padding: '25px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '700', opacity: 0.9 }}>
                      ESTIMATED TOTAL FINISH TIME
                    </h3>
                    <div style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {results.totalTime}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '10px', opacity: 0.8 }}>
                      Includes transitions
                    </div>
                  </div>

                  {/* ADJUST PACING SECTION - For all triathlon approaches */}
                  {raceTypes[results.raceType].type === 'triathlon' && (
                    <div style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '12px', border: '2px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '20px', color: colors.primary, fontWeight: '700', margin: 0 }}>
                          Adjust Your Pacing
                        </h3>
                        <button 
                          onClick={resetWhatIf}
                          style={{ padding: '8px 16px', fontSize: '12px', background: 'white', color: colors.primary, border: `2px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Reset
                        </button>
                      </div>

                      {/* Swimming */}
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Swimming</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToPace(whatIf.swimPace || paceToSeconds(results.swim.targetPace))}/100y
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            min={paceToSeconds(results.swim.targetPace) * 0.7}
                            max={paceToSeconds(results.swim.targetPace) * 1.3}
                            step="1"
                            value={whatIf.swimPace || paceToSeconds(results.swim.targetPace)}
                            onChange={(e) => updateWhatIf('swimPace', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={(() => {
                              const swimPaceSeconds = whatIf.swimPace || paceToSeconds(results.swim.targetPace);
                              const swimDistances = {
                                'Sprint Triathlon': 0.5,
                                'Olympic Triathlon': 0.93,
                                'Half Ironman (70.3)': 1.2,
                                'Full Ironman (140.6)': 2.4,
                                'Custom Triathlon': convertToMiles(formData.customSwimDistance, formData.customSwimUnit)
                              };
                              const swimDistanceYards = swimDistances[results.raceType] * 1760;
                              const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;
                              return secondsToTime(swimTime);
                            })()}
                            readOnly
                            style={{ padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', width: '80px', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                      </div>

                      {/* T1 */}
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>T1 (Swim-to-Bike)</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToTime(whatIf.t1Time || getTransitionTimes(results.raceType).t1)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            min="30"
                            max="600"
                            step="10"
                            value={whatIf.t1Time || getTransitionTimes(results.raceType).t1}
                            onChange={(e) => updateWhatIf('t1Time', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={secondsToTime(whatIf.t1Time || getTransitionTimes(results.raceType).t1)}
                            readOnly
                            style={{ padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', width: '80px', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', lineHeight: '1.4' }}>
                          T1 transitions from wetsuit to cycling usually takes longer than 2 mins. Estimated times for athletes who have transitioned well pacing for the distance; allow more time if you have cumbersome items to store and/or setting up.
                        </p>
                      </div>

                      {/* Cycling */}
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Cycling</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {(whatIf.bikeSpeed || results.bike.estimatedSpeed).toFixed(1)} mph
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            min={results.bike.estimatedSpeed * 0.7}
                            max={results.bike.estimatedSpeed * 1.3}
                            step="0.1"
                            value={whatIf.bikeSpeed || results.bike.estimatedSpeed}
                            onChange={(e) => updateWhatIf('bikeSpeed', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={(() => {
                              const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed;
                              const bikeDistances = {
                                'Sprint Triathlon': 12.4,
                                'Olympic Triathlon': 24.8,
                                'Half Ironman (70.3)': 56,
                                'Full Ironman (140.6)': 112,
                                'Custom Triathlon': convertToMiles(formData.customBikeDistance, formData.customBikeUnit)
                              };
                              const bikeTime = (bikeDistances[results.raceType] / bikeSpeed) * 3600;
                              return secondsToTime(bikeTime);
                            })()}
                            readOnly
                            style={{ padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', width: '80px', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                      </div>

                      {/* T2 */}
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>T2 (Bike-to-Run)</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToTime(whatIf.t2Time || getTransitionTimes(results.raceType).t2)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            min="30"
                            max="600"
                            step="10"
                            value={whatIf.t2Time || getTransitionTimes(results.raceType).t2}
                            onChange={(e) => updateWhatIf('t2Time', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={secondsToTime(whatIf.t2Time || getTransitionTimes(results.raceType).t2)}
                            readOnly
                            style={{ padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', width: '80px', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', lineHeight: '1.4' }}>
                          T2 transitions from cycling to running. More. Estimated times for athletes who have transitioned well pacing for the distance; allow more time if you have cumbersome items to store; elastic laces and no-tie setups help cut time and also enable a smooth transition; distances like iron, bike run would take.
                        </p>
                      </div>

                      {/* Running */}
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Running</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToPace(whatIf.runPace || paceToSeconds(results.run.estimatedPace))}/mi
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            min={paceToSeconds(results.run.estimatedPace) * 0.7}
                            max={paceToSeconds(results.run.estimatedPace) * 1.3}
                            step="1"
                            value={whatIf.runPace || paceToSeconds(results.run.estimatedPace)}
                            onChange={(e) => updateWhatIf('runPace', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={(() => {
                              const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace);
                              const runDistances = {
                                'Sprint Triathlon': 3.1,
                                'Olympic Triathlon': 6.2,
                                'Half Ironman (70.3)': 13.1,
                                'Full Ironman (140.6)': 26.2,
                                'Custom Triathlon': convertToMiles(formData.customRunDistance, formData.customRunUnit)
                              };
                              const runTime = runPace * runDistances[results.raceType];
                              return secondsToTime(runTime);
                            })()}
                            readOnly
                            style={{ padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', width: '80px', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                      </div>

                      {/* Projected Total Race Time Breakdown */}
                      <div style={{ marginTop: '25px', padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: `2px solid ${colors.primary}40` }}>
                        <h3 style={{ fontSize: '18px', color: colors.primary, fontWeight: '700', marginBottom: '15px', textAlign: 'center' }}>
                          Projected Total Race Time
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                          {/* Swim */}
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Swim</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.charcoal }}>
                              {(() => {
                                const swimPaceSeconds = whatIf.swimPace || paceToSeconds(results.swim.targetPace);
                                const swimDistances = {
                                  'Sprint Triathlon': 0.5,
                                  'Olympic Triathlon': 0.93,
                                  'Half Ironman (70.3)': 1.2,
                                  'Full Ironman (140.6)': 2.4
                                };
                                const swimDistanceYards = swimDistances[results.raceType] * 1760;
                                const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;
                                return secondsToTime(swimTime);
                              })()}
                            </div>
                          </div>

                          {/* T1 */}
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>T1</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.charcoal }}>
                              {secondsToTime(whatIf.t1Time || getTransitionTimes(results.raceType).t1)}
                            </div>
                          </div>

                          {/* Bike */}
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Bike</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.charcoal }}>
                              {(() => {
                                const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed;
                                const bikeDistances = {
                                  'Sprint Triathlon': 12.4,
                                  'Olympic Triathlon': 24.8,
                                  'Half Ironman (70.3)': 56,
                                  'Full Ironman (140.6)': 112
                                };
                                const bikeTime = (bikeDistances[results.raceType] / bikeSpeed) * 3600;
                                return secondsToTime(bikeTime);
                              })()}
                            </div>
                          </div>

                          {/* T2 */}
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>T2</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.charcoal }}>
                              {secondsToTime(whatIf.t2Time || getTransitionTimes(results.raceType).t2)}
                            </div>
                          </div>

                          {/* Run */}
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Run</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.charcoal }}>
                              {(() => {
                                const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace);
                                const runDistances = {
                                  'Sprint Triathlon': 3.1,
                                  'Olympic Triathlon': 6.2,
                                  'Half Ironman (70.3)': 13.1,
                                  'Full Ironman (140.6)': 26.2
                                };
                                const runTime = runPace * runDistances[results.raceType];
                                return secondsToTime(runTime);
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Total Time */}
                        <div style={{ padding: '15px', background: 'white', borderRadius: '6px', textAlign: 'center', border: `2px solid ${colors.primary}` }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Total</div>
                          <div style={{ fontSize: '28px', fontWeight: '900', color: colors.primary, letterSpacing: '1px' }}>
                            {calculateWhatIfTime()}
                          </div>
                        </div>
                      </div>

                      {/* Total Race Time */}
                      <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: `2px solid ${colors.primary}40`, textAlign: 'center', display: 'none' }}>
                        <div style={{ fontSize: '14px', color: colors.charcoal, fontWeight: '600', marginBottom: '8px' }}>
                          Total Race Time
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: colors.primary, letterSpacing: '1px' }}>
                          {calculateWhatIfTime()}
                        </div>
                      </div>

                      {/* Reminder Box */}
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff9e6', borderRadius: '8px', border: '1px solid #ffd54f' }}>
                        <p style={{ fontSize: '12px', color: colors.charcoal, lineHeight: '1.5', margin: 0 }}>
                          <strong>Remember:</strong> These serve as guidelines. Monitor how you <strong>feel</strong>, adjust for conditions (heat, wind, terrain), and trust your training. The best race plan is the one you can execute with confidence.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* RUNNING RACE RESULTS */}
              {raceTypes[results.raceType].type === 'run' && (
                <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                  <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                    {results.approach === 'fitness' ? 'PACING STRATEGY' : 'TARGET TIME BREAKDOWN'}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    {results.approach === 'fitness' ? (
                      <>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (PRIMARY)</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetHR} bpm</div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.hrRange}</div>
                        </div>
                        {results.run.targetPower !== 'N/A' && (
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Power (If Stryd)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPower}</div>
                          </div>
                        )}
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Pace</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPace}/mi</div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.paceRange}</div>
                        </div>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Goal Time</div>
                          <div style={{ fontSize: '32px', fontWeight: '800', color: colors.primary }}>{results.run.targetTime}</div>
                        </div>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Pace</div>
                          <div style={{ fontSize: '32px', fontWeight: '800', color: colors.charcoal }}>{results.run.requiredPace}/mi</div>
                        </div>
                      </>
                    )}
                  </div>
                  {results.approach === 'fitness' && results.run.estimatedTime && (
                    <div style={{ background: colors.primary, color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', marginBottom: '5px', opacity: 0.9 }}>Estimated Finish Time</div>
                      <div style={{ fontSize: '32px', fontWeight: '800' }}>{results.run.estimatedTime}</div>
                    </div>
                  )}
                  {results.approach === 'fitness' && (
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                      <strong>Strategy:</strong> {results.strategy.strategy}
                    </div>
                  )}
                </div>
              )}

              {/* RACE PHILOSOPHY */}
              <div style={{ marginBottom: '30px', padding: '20px', background: '#fff9e6', borderRadius: '12px', border: '2px solid #ffd54f' }}>
                <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                  PRIMARY MISTAKE
                </h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal, marginBottom: '15px' }}>
                  {results.strategy.mistake}
                </p>
                <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                  KEY MINDSET
                </h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal, fontStyle: 'italic' }}>
                  {results.strategy.mindset}
                </p>
              </div>

              {/* THE KEYSTONE RULE */}
              <div style={{ marginBottom: '30px', padding: '25px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>
                  THE KEYSTONE RULE
                </h3>
                <p style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: '600' }}>
                  Restraint early. Discipline in the middle. Execution late.
                </p>
                <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.9 }}>
                  Most athletes reverse that order — and that's why they plateau.
                </p>
              </div>

              {/* CTA */}
              <div style={{ padding: '30px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '700' }}>
                  WANT PERSONALIZED 1:1 COACHING?
                </h3>
                <p style={{ fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                  This calculator provides general pacing guidance. For a truly personalized race strategy tailored to YOUR specific needs, goals, and race-day conditions, consider 1:1 coaching with Keystone Endurance.
                </p>
                <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '1.8', textAlign: 'left' }}>
                  <div style={{ marginBottom: '8px' }}>• Custom training plans for swim, bike, run, and strength</div>
                  <div style={{ marginBottom: '8px' }}>• Personalized race-day execution strategies</div>
                  <div style={{ marginBottom: '8px' }}>• Unlimited communication and bi-weekly coaching calls</div>
                  <div>• Access to metabolic assessments and video form analysis</div>
                </div>
                <div style={{ display: 'inline-block', padding: '16px 20px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '13px', color: colors.primary, fontWeight: '600', marginBottom: '4px' }}>EMAIL US:</div>
                  <a href="mailto:coach@keystoneendurance.com" style={{ fontSize: '11px', color: colors.primary, fontWeight: 'bold', textDecoration: 'none', letterSpacing: '0px', whiteSpace: 'nowrap', display: 'block' }}>
                    COACH@KEYSTONEENDURANCE.COM
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons-grid">
                <button onClick={startOver} style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: '2px solid #ddd', borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  Start Over
                </button>
                <div>
                  <button onClick={exportToTextFile} style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', background: colors.primary, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px', boxShadow: `0 4px 12px ${colors.primary}60`, marginBottom: '10px' }}>
                    Export to Text File
                  </button>
                  <ul style={{ fontSize: '12px', color: colors.charcoal, lineHeight: '1.6', margin: 0, paddingLeft: '20px', textAlign: 'left' }}>
                    <li>Download complete pacing strategy as .txt file</li>
                    <li>Includes all metrics, splits, and guidance</li>
                    <li>Great for printing or offline reference</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ maxWidth: '900px', margin: '30px auto 0', textAlign: 'center', fontSize: '13px', color: 'white', opacity: 0.7, paddingBottom: '30px', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '8px' }}>© 2026 Keystone Endurance | Coaching for Triathletes and Distance Runners</div>
          <div>This calculator provides general pacing guidance. Always adjust based on race-day conditions and how you feel.</div>
        </div>
      </div>
    </div>
  );
}
