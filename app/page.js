'use client';

const FORMSPREE_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || 'https://formspree.io/f/YOUR_FORM_ID';

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
    '50 Mile Ultra': { distance: '50 Miles', type: 'run' },
    '100 Mile Ultra': { distance: '100 Miles', type: 'run' },
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

  const getRaceStrategy = (raceType, athleteLevel = 'Intermediate') => {
    const strategies = {
      'Sprint Triathlon': {
        'Recreational': {
          mistake: 'Bike Fatigue: Entering the run with depleted quads due to poor gearing or over-exertion on the bike.',
          strategy: 'Build Pace Gradually: Start the run 15-20 seconds per mile slower than goal pace to let your legs adapt to the new movement.',
          mindset: 'Fast not Frantic: Move with speed and purpose, but keep your breathing and movements under control.',
          swim: {
            mistake: 'Panic and Over-effort: Start-line anxiety often triggers hyperventilation and an unsustainable HR spike. Stay calm.',
            strategy: 'Easy Aerobic Swim, Wide Start: Position yourself on the outside of the pack for clear water. Focus on a relaxed, rhythmic stroke.',
            mindset: 'Calm Beats Fast: Staying relaxed in the water saves more energy and time than a frantic, high-effort stroke.',
            nutrition_before: 'Normal Meal: Eat a familiar, carb-rich meal (oatmeal, toast, or rice) 2–3 hours before. Avoid high fiber and fat.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Chaos: Transitions are high-stress environments. Moving without a plan leads to forgotten gear and lost time.',
            strategy: 'Deliberate Movements: Move through transition with purpose, not haste. Visualize each step of the process beforehand.',
            mindset: 'Smooth is Fast: Fluid, deliberate movements in transition always beat panicked, \'fast\' movements.',
            nutrition_before: '',
            nutrition_during: 'Carb Snack: A quick gel or chew taken during transition or early in the segment.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Overbiking: Pushing too hard on the bike feels fast now but \'sabotages\' your legs for the run later.',
            strategy: 'Comfortable-hard, Spin Cadence: Maintain a cadence of 85-95 RPM to preserve your leg muscles for the run. Effort should feel sustainable.',
            mindset: 'Save the Run: You can\'t win the race on the bike, but you can certainly lose it by overbiking.',
            nutrition_before: '',
            nutrition_during: 'Water Only: Focus on hydration to manage thirst without stomach sloshing.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'HR Spike: Transitioning from horizontal (swim) to vertical (run/bike) causes a sudden heart rate jump. Breathe through it.',
            strategy: 'Breathe before Running: Take 5-10 deep, calming breaths in T2 to reset your system before heading out on the run.',
            mindset: 'Reset: Use transition to clear your mind. Forget the previous segment and focus entirely on the next task.',
            nutrition_before: '',
            nutrition_during: 'Optional Snack: Take a small carb snack if you feel your energy dipping.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Bike Fatigue: Entering the run with depleted quads due to poor gearing or over-exertion on the bike.',
            strategy: 'Build Pace Gradually: Start the run 15-20 seconds per mile slower than goal pace to let your legs adapt to the new movement.',
            mindset: 'Fast not Frantic: Move with speed and purpose, but keep your breathing and movements under control.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Liquid recovery drinks are ideal.'
          },
        },
        'Intermediate': {
          mistake: 'Overstride: Trying to run too fast too early on \'jelly legs\' leads to poor mechanics and early fatigue.',
          strategy: 'Hold Pace then Kick: Maintain a steady, strong effort for the first 80% of the run, then \'empty the tank\' for the finish.',
          mindset: 'Race the Run: The triathlon doesn\'t really start until the run. This is where the results are decided.',
          swim: {
            mistake: 'Poor Positioning: Getting stuck in the middle of a pack in the swim leads to physical contact and disrupted rhythm.',
            strategy: 'Controlled Hard Effort: Push the pace but keep your breathing under control. You should be working, but not gasping.',
            mindset: 'Clean Water Matters: Finding a line away from the pack reduces drag and mental stress in the swim.',
            nutrition_before: 'Light Carbs: Small, easily digestible carb snack (banana or applesauce) 60-90 mins before. Keep it light.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Inefficiency: Wasted movements in transition or poor stroke mechanics in the water.',
            strategy: 'Practice Sequence: Every movement in transition should be a practiced habit. No thinking, just execution.',
            mindset: 'Free Speed: Aerodynamics and efficient transitions provide \'free\' time that doesn\'t cost physiological energy.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Power Spikes: Hard accelerations out of corners or on hills that burn through your limited glycogen stores.',
            strategy: 'Upper Z3 Controlled: Ride at the top of your Tempo zone. It should feel \'comfortably tough\' but sustainable.',
            mindset: 'No Wasted Watts: Every bit of power you put into the pedals should move you forward. Stay aero and steady.',
            nutrition_before: '',
            nutrition_during: 'Rinse Mouth: Swish sports drink and spit to trick the brain into producing more power.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Shoes On, Settle Cadence: Get into your shoes quickly, then immediately focus on finding your target cadence of 90+ RPM.',
            mindset: 'Quick Feet: Focus on a light, fast turnover to minimize the jarring impact on your legs.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Overstride: Trying to run too fast too early on \'jelly legs\' leads to poor mechanics and early fatigue.',
            strategy: 'Hold Pace then Kick: Maintain a steady, strong effort for the first 80% of the run, then \'empty the tank\' for the finish.',
            mindset: 'Race the Run: The triathlon doesn\'t really start until the run. This is where the results are decided.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Snack: Small carb + protein snack (chocolate milk or bar) within 30 mins.'
          },
        },
        'Competitive': {
          mistake: 'HR Ceiling: Reaching a point where you cannot increase your effort because your heart rate is already at its limit.',
          strategy: 'Progressive Aggression: Start strong and gradually increase the intensity as you get closer to the finish line.',
          mindset: 'Hold Form: Focus on technique when fatigue sets in. Efficiency is more important than raw effort now.',
          swim: {
            mistake: 'Oxygen Debt: Starting the swim or bike too hard, creating a deficit that forces you to slow down later.',
            strategy: 'Hard but Controlled: A high-intensity effort that requires focus to maintain, but isn\'t an all-out sprint yet.',
            mindset: 'Get Position Early: Fight for your spot in the swim or bike pack in the first few minutes so you can settle in.',
            nutrition_before: 'Carb Snack: Simple sugars (gel or chews) 15-30 mins before the start to top off glycogen.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Seconds Lost: Small errors like struggling with a wetsuit or shoes that add up to significant time loss.',
            strategy: 'Highly Rehearsed: Your transition should be so well-practiced that you could do it with your eyes closed.',
            mindset: 'Attack Transitions: View T1 and T2 as competitive segments. You can pass people here without breaking a sweat.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Over-gear Risk: Using a gear that is too heavy, placing excessive load on the muscles rather than the CV system.',
            strategy: 'Near Threshold, Smooth: Ride just below your \'red line\'. Focus on being aero and maintaining a steady power output.',
            mindset: 'Pressure without Panic: Work hard, but never let your heart rate or mind go \'into the red\'.',
            nutrition_before: '',
            nutrition_during: 'Rinse Mouth: Swish sports drink and spit to trick the brain into producing more power.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Fast Change, Settle Stride: Quick gear swap, then immediately focus on run cadence rather than speed to settle the legs.',
            mindset: 'Run Tall: Maintain good posture even when tired. It improves breathing and mechanical efficiency.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'HR Ceiling: Reaching a point where you cannot increase your effort because your heart rate is already at its limit.',
            strategy: 'Progressive Aggression: Start strong and gradually increase the intensity as you get closer to the finish line.',
            mindset: 'Hold Form: Focus on technique when fatigue sets in. Efficiency is more important than raw effort now.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Immediate: 50-75g of high-GI carbs post-finish to replenish depleted glycogen.'
          },
        },
        'Elite': {
          mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
          strategy: 'Match and Counter: If a competitor surges, match the effort, then look for your own opportunity to take the lead.',
          mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
          swim: {
            mistake: 'Oxygen Debt: Starting the swim or bike too hard, creating a deficit that forces you to slow down later.',
            strategy: 'Max Sustainable Start: The fastest pace you can hold without creating an oxygen debt you can\'t pay back.',
            mindset: 'Win Clean Water: Aggressively seek a clear swimming line early to avoid the \'washing machine\' effect of the pack.',
            nutrition_before: 'Carb Primed: High-GI carb snack 15 mins pre-race to ensure blood glucose is peaked for high intensity.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Seconds Lost: Small errors like struggling with a wetsuit or shoes that add up to significant time loss.',
            strategy: 'Explosive but Clean: High-intensity movements that remain technically perfect to avoid errors.',
            mindset: 'Every Second Counts: Respect the clock. A second saved in transition is as good as a second saved on the road.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Tactical Watts: Using power at the wrong times, such as \'hammering\' into a headwind instead of staying aero.',
            strategy: 'Surge Selectively: Use your power bursts only when they provide a clear tactical advantage (e.g., passing or hills).',
            mindset: 'Race the Course: Focus on the terrain and your own numbers, not the other athletes.',
            nutrition_before: '',
            nutrition_during: 'Rinse Mouth: Swish sports drink and spit to trick the brain into producing more power.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Execution Speed: Moving too fast in transition resulting in errors, or too slow resulting in time loss.',
            strategy: 'No Hesitation: React instantly to transition cues or race developments. Doubt is slower than error.',
            mindset: 'Transition Violence: Move through T1 and T2 with extreme aggression and focus. Leave nothing on the table.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
            strategy: 'Match and Counter: If a competitor surges, match the effort, then look for your own opportunity to take the lead.',
            mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue for 4 hours.'
          },
        },
      },

      'Olympic Triathlon': {
        'Recreational': {
          mistake: 'Early Fade: Starting the run at a pace your legs aren\'t yet ready to support after the bike leg.',
          strategy: 'Conservative First Mile: Deliberately run the first mile slower than goal pace to ensure you have legs for the finish.',
          mindset: 'Finish Proud: Empty the tank in the final mile. Leave the course knowing you gave everything.',
          swim: {
            mistake: 'Early Panic: Fear of the swim distance or mass start leading to an inefficient, panicked stroke.',
            strategy: 'Smooth Aerobic: A relaxed, sustainable pace where you focus on technique and efficient breathing.',
            mindset: 'Relax the Exhale: Focus on breathing out. It lowers your heart rate and keeps your body from tensing up.',
            nutrition_before: 'Normal Meal: Eat a familiar, carb-rich meal (oatmeal, toast, or rice) 2–3 hours before. Avoid high fiber and fat.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Cognitive Overload: Having too much to remember in T1 or T2, leading to missed steps (like leaving your helmet on).',
            strategy: 'Simple Checklist: Have a 3-point mental list for transition (e.g., Helmet, Shoes, Glasses) to avoid errors.',
            mindset: 'Slow is Smooth: Moving calmly in transition prevents errors. And smooth is eventually fast.',
            nutrition_before: '',
            nutrition_during: 'Carb Snack: A quick gel or chew taken during transition or early in the segment.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Overbiking: Pushing too hard on the bike feels fast now but \'sabotages\' your legs for the run later.',
            strategy: 'Upper Z2 Discipline: Stay at the top of your \'Endurance\' zone. Don\'t let ego push you into Tempo (Z3) early.',
            mindset: 'Bike Sets Run: Your performance on the run is a direct reflection of how well you managed your bike leg.',
            nutrition_before: '',
            nutrition_during: 'Fueling: Target 45–60g of carbs per hour using a mix of liquids and gels.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Leg Shock: The jarring sensation of the first mile of the run when blood hasn\'t fully redistributed to the running muscles.',
            strategy: 'Jog Out Controlled: Start the run with a short, easy stride to let the blood flow adjust from the bike.',
            mindset: 'Reset System: Use the first few minutes of the run to let your heart rate and stomach settle.',
            nutrition_before: '',
            nutrition_during: 'Optional Snack: Take a small carb snack if you feel your energy dipping.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Early Fade: Starting the run at a pace your legs aren\'t yet ready to support after the bike leg.',
            strategy: 'Conservative First Mile: Deliberately run the first mile slower than goal pace to ensure you have legs for the finish.',
            mindset: 'Finish Proud: Empty the tank in the final mile. Leave the course knowing you gave everything.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Liquid recovery drinks are ideal.'
          },
        },
        'Intermediate': {
          mistake: 'Overpacing: Trying to hold a pace that is theoretically possible but isn\'t sustainable for the day\'s conditions.',
          strategy: 'Controlled Speed: Moving fast while maintaining total control over your breathing and form.',
          mindset: 'Run Patient: Don\'t chase the PR in the first mile. Let the pace come to you as your legs settle.',
          swim: {
            mistake: 'Poor Positioning: Getting stuck in the middle of a pack in the swim leads to physical contact and disrupted rhythm.',
            strategy: 'Smooth Strong Tempo: A solid, rhythmic effort that feels powerful but manageable.',
            mindset: 'Long Strokes: Focus on distance per stroke in the swim. It’s more efficient than a fast, short stroke.',
            nutrition_before: 'Light Carbs: Small, easily digestible carb snack (banana or applesauce) 60-90 mins before. Keep it light.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Rushed Setup: Failing to organize gear in transition, leading to fumbling when every second counts.',
            strategy: 'Practice Sequence: Every movement in transition should be a practiced habit. No thinking, just execution.',
            mindset: 'Control Wins: The athlete who manages their energy, emotions, and mechanics the best will win.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Power Creep: Allowing your wattage to slowly drift upward during the ride as you feel \'good\', ending in a late-race crash.',
            strategy: 'Low Z2 Discipline: Truly easy, aerobic effort. This is about patience and saving matches for the marathon.',
            mindset: 'Run the Plan: Ignore what others are doing. Stick to your prescribed heart rate and pace zones.',
            nutrition_before: '',
            nutrition_during: 'Fueling: Target 60–75g of carbs per hour. Be consistent; don\'t wait for hunger.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Shoes On, Settle Cadence: Get into your shoes quickly, then immediately focus on finding your target cadence of 90+ RPM.',
            mindset: 'Quick Feet: Focus on a light, fast turnover to minimize the jarring impact on your legs.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Overpacing: Trying to hold a pace that is theoretically possible but isn\'t sustainable for the day\'s conditions.',
            strategy: 'Controlled Speed: Moving fast while maintaining total control over your breathing and form.',
            mindset: 'Run Patient: Don\'t chase the PR in the first mile. Let the pace come to you as your legs settle.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Recovery Meal: Balanced meal (protein/complex carbs) within 2 hours. Focus on hydration.'
          },
        },
        'Competitive': {
          mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
          strategy: 'Start Slightly Conservative: Give yourself a 5-minute \'buffer\' at the start to find your rhythm before pushing.',
          mindset: 'Flip the Switch: Mental transition. The bike is over; you are now a runner. Adopt that identity immediately.',
          swim: {
            mistake: 'Pack Positioning: Getting dropped from a legal draft or stuck behind slower athletes in the swim/bike.',
            strategy: 'Hard but Controlled: A high-intensity effort that requires focus to maintain, but isn\'t an all-out sprint yet.',
            mindset: 'Get Position Early: Fight for your spot in the swim or bike pack in the first few minutes so you can settle in.',
            nutrition_before: 'Carb Snack: Simple sugars (gel or chews) 15-30 mins before the start to top off glycogen.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Lost Seconds: Efficiency errors that don\'t feel big but separate the podium from the rest of the pack.',
            strategy: 'Highly Rehearsed: Your transition should be so well-practiced that you could do it with your eyes closed.',
            mindset: 'Attack Transitions: View T1 and T2 as competitive segments. You can pass people here without breaking a sweat.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Run Sabotage: Pushing 5-10 watts too high on the bike, which costs you 5-10 minutes on the run.',
            strategy: 'Low Z3 Steady Watts: Maintain consistent power in your lower \'Tempo\' zone, avoiding spikes on hills.',
            mindset: 'Stay Legal: Don\'t risk a drafting penalty. The 5 minutes in the penalty tent are never worth the \'free\' speed.',
            nutrition_before: '',
            nutrition_during: 'High Carb: Target 75–90g of carbs per hour. Train your gut in advance for this volume.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Breathe and Go: A quick mental reset and a deep breath, then immediate execution.',
            mindset: 'Protect the Run: Everything you do on the bike should be filtered through the question: \'How will this affect my run?\'',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
            strategy: 'Start Slightly Conservative: Give yourself a 5-minute \'buffer\' at the start to find your rhythm before pushing.',
            mindset: 'Flip the Switch: Mental transition. The bike is over; you are now a runner. Adopt that identity immediately.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Immediate: 50-75g of high-GI carbs post-finish to replenish depleted glycogen.'
          },
        },
        'Elite': {
          mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
          strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
          mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
          swim: {
            mistake: 'Pack Positioning: Getting dropped from a legal draft or stuck behind slower athletes in the swim/bike.',
            strategy: 'Hard but Relaxed: Maximum effort while keeping the face, neck, and shoulders completely loose.',
            mindset: 'Win Clean Water: Aggressively seek a clear swimming line early to avoid the \'washing machine\' effect of the pack.',
            nutrition_before: 'Carb Primed: High-GI carb snack 15 mins pre-race to ensure blood glucose is peaked for high intensity.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Execution Errors: Mechanical mistakes, missed turns, or forgotten equipment due to high-intensity stress.',
            strategy: 'Rehearsed Efficiency: Using muscle memory to move through segments with zero wasted motion.',
            mindset: 'Every Second Counts: Respect the clock. A second saved in transition is as good as a second saved on the road.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Tactical Dynamics: Misreading the race flow or the moves of competitors, resulting in lost time.',
            strategy: 'Upper Z3 Precise: Holding a specific, high-intensity power target with minimal deviation.',
            mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
            nutrition_before: '',
            nutrition_during: 'Elite Fueling: 90g+ of carbs per hour via hydrogel or liquid fuel. Requires high GI training.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Execution Speed: Moving too fast in transition resulting in errors, or too slow resulting in time loss.',
            strategy: 'Clean and Fast: Prioritize a clean, error-free transition over a \'fast\' one; clean ends up being faster.',
            mindset: 'Transition Violence: Move through T1 and T2 with extreme aggression and focus. Leave nothing on the table.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
            strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
            mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue for 4 hours.'
          },
        },
      },

      'Half Ironman (70.3)': {
        'Recreational': {
          mistake: 'Early Fade: Starting the run at a pace your legs aren\'t yet ready to support after the bike leg.',
          strategy: 'Build Pace Gradually: Start the run 15-20 seconds per mile slower than goal pace to let your legs adapt to the new movement.',
          mindset: 'Finish strong, not shocked: If you cross the line and immediately feel like you could have done more, you paced it perfectly. If you are gasping at mile 1, the race is already over.',
          swim: {
            mistake: 'Early Panic: Fear of the swim distance or mass start leading to an inefficient, panicked stroke.',
            strategy: 'Position-first Swim: Prioritize finding clear water and a good line over pulling as hard as possible.',
            mindset: 'Own the Line: Be assertive in the water and on the bike. Take the most efficient path available to you.',
            nutrition_before: 'Carb Meal: Balanced meal with a heavy emphasis on complex carbs 3 hours prior. Hydrate well.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Chaos: Transitions are high-stress environments. Moving without a plan leads to forgotten gear and lost time.',
            strategy: 'Deliberate Movements: Move through transition with purpose, not haste. Visualize each step of the process beforehand.',
            mindset: 'Smooth is Fast: Fluid, deliberate movements in transition always beat panicked, \'fast\' movements.',
            nutrition_before: '',
            nutrition_during: 'Carb Snack: A quick gel or chew taken during transition or early in the segment.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Overbiking: Pushing too hard on the bike feels fast now but \'sabotages\' your legs for the run later.',
            strategy: 'Upper Z2 Discipline: Stay at the top of your \'Endurance\' zone. Don\'t let ego push you into Tempo (Z3) early.',
            mindset: 'Save the Run: You can\'t win the race on the bike, but you can certainly lose it by overbiking.',
            nutrition_before: '',
            nutrition_during: 'Fueling: Aim for a steady intake of 60g of carbs every hour.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Leg Shock: The jarring sensation of the first mile of the run when blood hasn\'t fully redistributed to the running muscles.',
            strategy: 'Breathe before Running: Take 5-10 deep, calming breaths in T2 to reset your system before heading out on the run.',
            mindset: 'Zero Waste: No unnecessary movements, no unnecessary power spikes, no unnecessary time in transition.',
            nutrition_before: '',
            nutrition_during: 'Optional Snack: Take a small carb snack if you feel your energy dipping.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Early Fade: Starting the run at a pace your legs aren\'t yet ready to support after the bike leg.',
            strategy: 'Build Pace Gradually: Start the run 15-20 seconds per mile slower than goal pace to let your legs adapt to the new movement.',
            mindset: 'Finish strong, not shocked: If you cross the line and immediately feel like you could have done more, you paced it perfectly. If you are gasping at mile 1, the race is already over.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Liquid recovery drinks are ideal.'
          },
        },
        'Intermediate': {
          mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
          strategy: 'Hold Pace then Kick: Maintain a steady, strong effort for the first 80% of the run, then \'empty the tank\' for the finish.',
          mindset: 'Race the Run: The triathlon doesn\'t really start until the run. This is where the results are decided.',
          swim: {
            mistake: 'Marginal Gains: The accumulation of small efficiencies that lead to a faster overall time.',
            strategy: 'Smooth Strong Tempo: A solid, rhythmic effort that feels powerful but manageable.',
            mindset: 'Clean Water Matters: Finding a line away from the pack reduces drag and mental stress in the swim.',
            nutrition_before: 'Carb Load: Increase carb intake 24 hours prior. Final pre-race meal should be 80% carbs.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Marginal Losses: Small, cumulative errors in transition and execution that hurt the overall finish time.',
            strategy: 'Practice Sequence: Every movement in transition should be a practiced habit. No thinking, just execution.',
            mindset: 'Control Chaos: Use your breath and your plan to stay centered when the race gets hectic.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Tactical Wattage: Failing to apply power effectively on terrain changes or into wind shifts.',
            strategy: 'Upper Z3 Controlled: Ride at the top of your Tempo zone. It should feel \'comfortably tough\' but sustainable.',
            mindset: 'No Wasted Watts: Every bit of power you put into the pedals should move you forward. Stay aero and steady.',
            nutrition_before: '',
            nutrition_during: 'Fueling: Consistently intake 70-80g of carbs per hour for sustained energy.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Shoes On, Settle Cadence: Get into your shoes quickly, then immediately focus on finding your target cadence of 90+ RPM.',
            mindset: 'Instant Run Legs: Focus on a high-cadence, short stride to \'wake up\' your running muscles immediately.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
            strategy: 'Hold Pace then Kick: Maintain a steady, strong effort for the first 80% of the run, then \'empty the tank\' for the finish.',
            mindset: 'Race the Run: The triathlon doesn\'t really start until the run. This is where the results are decided.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Full Recovery: High carb/protein meal within 1 hour. Prioritize anti-inflammatory foods.'
          },
        },
        'Competitive': {
          mistake: 'Surge Coverage: Being unable to respond to a tactical move by a competitor at a critical moment.',
          strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
          mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
          swim: {
            mistake: 'Marginal Gains: The accumulation of small efficiencies that lead to a faster overall time.',
            strategy: 'Explosive Precision: High-intensity efforts executed with total technical accuracy.',
            mindset: 'Get Position Early: Fight for your spot in the swim or bike pack in the first few minutes so you can settle in.',
            nutrition_before: 'Carb Optimized: Precision carb loading protocol tailored to your sweat rate and body weight 24-48 hours out.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Momentum Loss: Allowing speed to drop unnecessarily during turns, aid stations, or transitions.',
            strategy: 'Highly Rehearsed: Your transition should be so well-practiced that you could do it with your eyes closed.',
            mindset: 'This is Free Speed: Perfecting your gear and your transition is the cheapest way to get faster.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Run Sabotage: Pushing 5-10 watts too high on the bike, which costs you 5-10 minutes on the run.',
            strategy: 'Low Z3 Steady Watts: Maintain consistent power in your lower \'Tempo\' zone, avoiding spikes on hills.',
            mindset: 'Stay Legal: Don\'t risk a drafting penalty. The 5 minutes in the penalty tent are never worth the \'free\' speed.',
            nutrition_before: '',
            nutrition_during: 'High Fueling: Target 80-90g of carbs per hour to support long-duration power.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Breathe and Go: A quick mental reset and a deep breath, then immediate execution.',
            mindset: 'Nothing Rushed: Moving at 90% speed with 100% accuracy is faster than 100% speed with 90% accuracy.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Surge Coverage: Being unable to respond to a tactical move by a competitor at a critical moment.',
            strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
            mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Recovery Meal: Balanced meal (protein/complex carbs) within 2 hours. Focus on hydration.'
          },
        },
        'Elite': {
          mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
          strategy: 'Respond Selectively: Only cover surges from competitors that actually threaten your race goals.',
          mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
          swim: {
            mistake: 'Marginal Gains: The accumulation of small efficiencies that lead to a faster overall time.',
            strategy: 'Hard but Relaxed: Maximum effort while keeping the face, neck, and shoulders completely loose.',
            mindset: 'Win Clean Water: Aggressively seek a clear swimming line early to avoid the \'washing machine\' effect of the pack.',
            nutrition_before: '3-day Carb Load: High carb load for 72 hours (8-10g/kg). Small carb snack 1 hour before the start.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Execution Errors: Mechanical mistakes, missed turns, or forgotten equipment due to high-intensity stress.',
            strategy: 'Rehearsed Efficiency: Using muscle memory to move through segments with zero wasted motion.',
            mindset: 'Every Second Counts: Respect the clock. A second saved in transition is as good as a second saved on the road.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Tactical Dynamics: Misreading the race flow or the moves of competitors, resulting in lost time.',
            strategy: 'Upper Z3 Precise: Holding a specific, high-intensity power target with minimal deviation.',
            mindset: 'Race People: Use the athletes around you as \'tow trucks\' or targets. Competition is a powerful motivator.',
            nutrition_before: '',
            nutrition_during: 'Elite Fueling: 90g+ of carbs per hour via hydrogel or liquid fuel. Requires high GI training.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Execution Speed: Moving too fast in transition resulting in errors, or too slow resulting in time loss.',
            strategy: 'Clean and Fast: Prioritize a clean, error-free transition over a \'fast\' one; clean ends up being faster.',
            mindset: 'Transition Violence: Move through T1 and T2 with extreme aggression and focus. Leave nothing on the table.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
            strategy: 'Respond Selectively: Only cover surges from competitors that actually threaten your race goals.',
            mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue for 4 hours.'
          },
        },
      },

      'Full Ironman (140.6)': {
        'Recreational': {
          mistake: 'Glycogen Drop: A sudden drop in energy levels due to a failure to fuel early in the bike leg.',
          strategy: 'Run/walk Early: Use a run/walk strategy from the very start of the run to manage core temperature and fatigue.',
          mindset: 'Forward motion: Even when it hurts, keep moving toward the finish line. Every step brings you closer.',
          swim: {
            mistake: 'Anxiety: Pre-race or in-race stress that consumes mental energy and affects decision-making.',
            strategy: 'Easy-fast Aerobic: A pace that feels \'easy\' but results in a \'fast\' time due to perfect efficiency.',
            mindset: 'Bike Boring: If the bike leg feels \'boring\' and easy, you are likely pacing it perfectly for a strong run.',
            nutrition_before: 'Carb Meal: Balanced meal with a heavy emphasis on complex carbs 3 hours prior. Hydrate well.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Rushing: Moving frantically rather than deliberately, which usually results in \'slow\' time.',
            strategy: 'Deliberate Movements: Move through transition with purpose, not haste. Visualize each step of the process beforehand.',
            mindset: 'Nothing Rushed: Moving at 90% speed with 100% accuracy is faster than 100% speed with 90% accuracy.',
            nutrition_before: '',
            nutrition_during: 'Carb Snack: A quick gel or chew taken during transition or early in the segment.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Ego: Trying to race people early in the bike or run rather than sticking to your own prescribed power and heart rate zones.',
            strategy: 'Low Z2 Discipline: Truly easy, aerobic effort. This is about patience and saving matches for the marathon.',
            mindset: 'Forward Motion: Even when it hurts, keep moving toward the finish line. Every step brings you closer.',
            nutrition_before: '',
            nutrition_during: 'Fueling: Maintain a steady 60-70g of carbs per hour to avoid \'bonking\'.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Leg Shock: The jarring sensation of the first mile of the run when blood hasn\'t fully redistributed to the running muscles.',
            strategy: 'Walk 20–30 sec: Use a scheduled walking break in T2 to lower your heart rate and prepare for a steady run.',
            mindset: 'Stay Patient: The race is long. Don\'t let an early mistake or a slow segment derail your entire plan.',
            nutrition_before: '',
            nutrition_during: 'Optional Snack: Take a small carb snack if you feel your energy dipping.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Glycogen Drop: A sudden drop in energy levels due to a failure to fuel early in the bike leg.',
            strategy: 'Run/walk Early: Use a run/walk strategy from the very start of the run to manage core temperature and fatigue.',
            mindset: 'Forward motion: Even when it hurts, keep moving toward the finish line. Every step brings you closer.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Aggressive Refuel: High calorie, high carb intake for 24 hours to address the deficit.'
          },
        },
        'Intermediate': {
          mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
          strategy: 'Controlled Tempo: A firm, rhythmic pace that feels like \'work\' but is sustainable for a long duration.',
          mindset: 'Fuel Equals Pace: You can\'t run fast if your tank is empty. Nutrition is the primary limiter of performance.',
          swim: {
            mistake: 'Lost Focus: Allowing the mind to wander during long stretches, leading to a drop in pace or power.',
            strategy: 'Smooth Aerobic: A relaxed, sustainable pace where you focus on technique and efficient breathing.',
            mindset: 'Long and Relaxed: Focus on a long, efficient swim stroke and keeping your muscles loose.',
            nutrition_before: 'Carb Load: Increase carb intake 24 hours prior. Final pre-race meal should be 80% carbs.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Cognitive Overload: Having too much to remember in T1 or T2, leading to missed steps (like leaving your helmet on).',
            strategy: 'Practice Sequence: Every movement in transition should be a practiced habit. No thinking, just execution.',
            mindset: 'Stay Patient: The race is long. Don\'t let an early mistake or a slow segment derail your entire plan.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Rushed Exit: Leaving T2 before your heart rate has stabilized or before your mind has shifted to the run.',
            strategy: 'Deliberate Setup: Taking the extra 5 seconds in transition to ensure your nutrition and gear are perfectly placed.',
            mindset: 'Clean Water: Find your own space in the swim to maintain your rhythm and avoid being hit.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Mid-run Fade: A mental and physical slump around the midway point of the run leg.',
            strategy: 'Controlled Tempo: A firm, rhythmic pace that feels like \'work\' but is sustainable for a long duration.',
            mindset: 'Fuel Equals Pace: You can\'t run fast if your tank is empty. Nutrition is the primary limiter of performance.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Multi-day recovery: Nutrient-dense meals and hydration for 3-5 days. Avoid intense activity.'
          },
        },
        'Competitive': {
          mistake: 'Entropy: The natural breakdown of gear, focus, and physical ability over the course of a long race.',
          strategy: 'Even Effort: Maintain a constant level of intensity from start to finish, regardless of terrain.',
          mindset: 'Race the Field: Use your competitors to gauge your effort and stay motivated in the final stages.',
          swim: {
            mistake: 'Pack Control: Failing to manage your position relative to others, risking penalties or inefficient lines.',
            strategy: 'Hard but Controlled: A high-intensity effort that requires focus to maintain, but isn\'t an all-out sprint yet.',
            mindset: 'Clean Water Matters: Finding a line away from the pack reduces drag and mental stress in the swim.',
            nutrition_before: 'Carb Optimized: Precision carb loading protocol tailored to your sweat rate and body weight 24-48 hours out.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Fuel Execution: Forgetting to eat or drink according to the plan because you are too focused on the effort.',
            strategy: 'Highly Rehearsed: Your transition should be so well-practiced that you could do it with your eyes closed.',
            mindset: 'Race Late: The competition only truly begins in the second half of the run. Be ready for it.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Power Creep: Allowing your wattage to slowly drift upward during the ride as you feel \'good\', ending in a late-race crash.',
            strategy: 'Mid Z2 Steady: Consistent, moderate effort in your \'Endurance\' zone. The goal is steady state.',
            mindset: 'Position Matters: Tactical positioning in the water or a bike group can save you massive amounts of energy.',
            nutrition_before: '',
            nutrition_during: 'High Carb: Target 75–90g of carbs per hour. Train your gut in advance for this volume.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Mental Shift: The difficulty of transitioning the brain from \'bike mode\' (power/cadence) to \'run mode\' (form/turnover).',
            strategy: 'Controlled Jog Out: Exiting T2 at a very easy pace to allow the body to adapt to the impact of running.',
            mindset: 'No Waste: Focus on absolute efficiency in every movement, every breath, and every watt.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Entropy: The natural breakdown of gear, focus, and physical ability over the course of a long race.',
            strategy: 'Even Effort: Maintain a constant level of intensity from start to finish, regardless of terrain.',
            mindset: 'Race the Field: Use your competitors to gauge your effort and stay motivated in the final stages.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Full Rebuild: High protein/carb focus for 72 hours. Supplement with electrolytes.'
          },
        },
        'Elite': {
          mistake: 'Entropy management',
          strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
          mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
          swim: {
            mistake: 'Tactical Separation: Missing the opportunity to create a gap or losing the \'draft\' of a legal group.',
            strategy: 'Hard but Relaxed: Maximum effort while keeping the face, neck, and shoulders completely loose.',
            mindset: 'Go Now: When it’s time to attack, don\'t hesitate. Commit fully to the move.',
            nutrition_before: '3-day Carb Load: High carb load for 72 hours (8-10g/kg). Small carb snack 1 hour before the start.',
            nutrition_during: 'None: Focus on your stroke; you will fuel on the bike.',
            nutrition_after: ''
          },
          t1: {
            mistake: 'Momentum: Allowing your speed to bleed away during technical sections or when fatigue sets in.',
            strategy: 'Explosive but Clean: High-intensity movements that remain technically perfect to avoid errors.',
            mindset: 'Make Moves: Be an active participant in the race. Don\'t just follow; look for opportunities to lead.',
            nutrition_before: '',
            nutrition_during: 'Carb Priming: A fast-acting carb source (like a gel) to keep blood glucose steady.',
            nutrition_after: ''
          },
          bike: {
            mistake: 'Tactical Effort: Misallocating energy to sections of the course where the \'return on investment\' is low.',
            strategy: 'Upper Z2 Precise: Staying at the very edge of your aerobic zone without crossing over into Tempo.',
            mindset: 'This is a Warm-up: Treat the swim and bike as just a prelude to the \'real\' race, which is the run.',
            nutrition_before: '',
            nutrition_during: 'High Fueling: Target 80-90g of carbs per hour to support long-duration power.',
            nutrition_after: ''
          },
          t2: {
            mistake: 'Execution Speed: Moving too fast in transition resulting in errors, or too slow resulting in time loss.',
            strategy: 'Clean and Fast: Prioritize a clean, error-free transition over a \'fast\' one; clean ends up being faster.',
            mindset: 'Transition Violence: Move through T1 and T2 with extreme aggression and focus. Leave nothing on the table.',
            nutrition_before: '',
            nutrition_during: 'Carb Preload: Taking in calories immediately before a hard effort to ensure availability.',
            nutrition_after: ''
          },
          run: {
            mistake: 'Entropy management',
            strategy: 'Even Effort, Surge Late: Hold a steady pace for the majority of the segment, then attack in the final quarter.',
            mindset: 'Race the Last 5K: The finish is close. This is the time to start \'spending\' whatever energy you have left.',
            nutrition_before: '',
            nutrition_during: '',
            nutrition_after: 'Structured Rebuild: Scientific recovery protocol focusing on amino acids and high-GI carbs.'
          },
        },
      },

      '5K Run': {
        'Recreational': {
          mistake: 'Early Overexertion: The urge to sprint the first 400m because you feel \'fresh\' will ruin your finish.',
          strategy: 'Start 10–20 sec/mile slower than goal pace. Build speed incrementally in the second half.',
          mindset: 'Finish strong, not shocked: If you cross the line and immediately feel like you could have done more, you paced it perfectly. If you are gasping at mile 1, the race is already over.',
          nutrition_before: 'Normal Meal: Eat a familiar, carb-rich meal (oatmeal, toast, or rice) 2–3 hours before. Avoid high fiber and fat.',
          nutrition_during: 'None: 5K intensity is too high for heavy digestion; focus on small sips of water only if needed.',
          nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Prioritize easily digestible liquid recovery drinks.'
        },
        'Intermediate': {
          mistake: 'Adrenaline Pacing: High heart rate from the start line adrenaline can lead to an early \'blow up\'.',
          strategy: 'Hold back slightly in Mile 1. Find and lock into your goal pace during the middle miles.',
          mindset: 'Spend fitness late: You have a finite amount of "speed coins" to spend. Don\'t throw them away in the first 5 minutes; save the biggest spend for the final 800 meters.',
          nutrition_before: 'Light Carbs: Small, easily digestible carb snack (banana or applesauce) 60-90 mins before. Keep it light.',
          nutrition_during: 'Optional Rinse: Use a carb mouth rinse (swish and spit) at the 2.5K mark to signal the brain for more power.',
          nutrition_after: 'Snack: Small carb + protein snack (chocolate milk or bar) within 30 mins to jumpstart repair.'
        },
        'Competitive': {
          mistake: 'Impatience: Attacking too early in the middle mile before you\'ve earned the right to suffer.',
          strategy: 'Hit goal pace immediately. Dig deep and squeeze the pace for the final mile to the line.',
          mindset: 'Controlled pain: Accept that mile 2 will be uncomfortable. Don\'t fight the discomfort—manage it until the final 1k, then let the fire burn.',
          nutrition_before: 'Carb Snack: Simple sugars (gel or chews) 15-30 mins before the start to top off glycogen.',
          nutrition_during: 'None: 5K intensity is too high for heavy digestion; focus on small sips of water only if needed.',
          nutrition_after: 'Immediate: 50-75g of high-GI carbs immediately post-finish to replenish depleted glycogen.'
        },
        'Elite': {
          mistake: 'Marginal Errors: A single mile that is 2 seconds off can cost you the podium at this level.',
          strategy: 'Execute a surgical, precise start. Use a tactical, aggressive finish to secure your rank.',
          mindset: 'Precision first: Every stride and every turn must be calculated. One tactical error in positioning is harder to fix than a drop in physical pace.',
          nutrition_before: 'Carb Priming: High-GI carb snack 15 mins pre-race to ensure blood glucose is peaked for high intensity.',
          nutrition_during: 'None: 5K intensity is too high for heavy digestion; focus on small sips of water only if needed.',
          nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue high-carb intake for 4 hours.'
        },
      },

      '10K Run': {
        'Recreational': {
          mistake: 'Fatigue Creep: The gradual, unnoticed loss of form and speed between miles 3 and 5.',
          strategy: 'Be conservative for the first 2 miles. Focus on maintaining a relentless, steady effort mid-race.',
          mindset: 'Hold effort: Focus on the sensation of your breathing and leg turnover. Don\'t let your mind wander; keep the pressure consistent like a steady flame.',
          nutrition_before: 'Carb-Focused Meal: Balanced meal with a heavy emphasis on complex carbs 3 hours prior. Hydrate well.',
          nutrition_during: 'Water Only: Focus on small sips of water at aid stations to manage thirst without stomach sloshing.',
          nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Prioritize easily digestible liquid recovery drinks.'
        },
        'Intermediate': {
          mistake: 'Middle-Mile Fade: Losing mental focus when initial excitement wears off but the finish is still distant.',
          strategy: 'Use even pacing throughout the first 7K. Begin pressing your pace aggressively for the final 3K.',
          mindset: 'Calm early: Treat the first 5k like a business meeting—stay professional and composed. The second 5k is where the real work begins.',
          nutrition_before: 'Carb Snack: Simple sugars (gel or chews) 15-30 mins before the start to top off glycogen.',
          nutrition_during: 'Optional Gel: If the race exceeds 50 mins, take 1 gel at the 5K mark. Otherwise, focus on water.',
          nutrition_after: 'Recovery Meal: Balanced meal (protein/complex carbs) within 2 hours. Focus on hydration and electrolytes.'
        },
        'Competitive': {
          mistake: 'Over-Response: Chasing every surge from competitors and wasting energy too early in the race.',
          strategy: 'Maintain an even effort for 5 miles. Aim for a negative split by running the final 1.2 miles faster.',
          mindset: 'Race the last 3K: Everything before 7k is just setup. The race doesn\'t actually start until there are 3,000 meters left. Be the one who accelerates while others fade.',
          nutrition_before: 'Carb Load: Increase carb intake 24 hours prior. Final pre-race meal should be 80% carbs.',
          nutrition_during: 'Gel Optional: 1 gel or liquid carb intake at 5K if needed for late-race energy.',
          nutrition_after: 'Immediate: 50-75g of high-GI carbs immediately post-finish to replenish depleted glycogen.'
        },
        'Elite': {
          mistake: 'Tactical Surges: Failing to respond to or initiate key moves that break the competition pack.',
          strategy: 'Run based on perceived effort. Use tactical surges late in the race to break competitors.',
          mindset: 'Efficiency wins: In a field of equals, the runner who moves with the least amount of wasted energy wins. Stay relaxed in the face, shoulders, and hands.',
          nutrition_before: 'Carb Optimized: Precision carb loading protocol tailored to your sweat rate and body weight 24-48 hours out.',
          nutrition_during: 'Minimal: Focus on mouth rinsing or 15g of fast-acting liquid carbs mid-race.',
          nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue high-carb intake for 4 hours.'
        },
      },

      'Half Marathon': {
        'Recreational': {
          mistake: 'Limited Durability: Muscular endurance giving out before the 13.1-mile mark.',
          strategy: 'Start conservative. Protect your muscular energy specifically for the final 5K stretch.',
          mindset: 'Finish strong: Your goal is to be passing people in the final 3 miles. If you\'re being passed, you went out too fast. Protect the legs.',
          nutrition_before: 'Carb-Focused Meal: Balanced meal with a heavy emphasis on complex carbs 3 hours prior. Hydrate well.',
          nutrition_during: 'Optional Gel: If the race exceeds 50 mins, take 1 gel at the 5K mark. Otherwise, focus on water.',
          nutrition_after: 'Recovery: 20g protein + 60g carbs within 45 mins. Prioritize easily digestible liquid recovery drinks.'
        },
        'Intermediate': {
          mistake: 'Early Enthusiasm: Letting downhills or crowds push you 10-15s too fast in the first 3 miles.',
          strategy: 'Run a disciplined, even first half. Gradually increase the pressure throughout the second half.',
          mindset: 'Patience buys speed: Every second you "save" by going too fast in the first 5 miles will cost you a minute in the last 3 miles. Pay for your finish with early patience.',
          nutrition_before: 'Full Prep: High-carb dinner the night before + a light, familiar carb breakfast 3 hours before start.',
          nutrition_during: 'Gel Protocol: 1 energy gel with water every 40–45 minutes. Maintain a steady trickle of 30-45g carbs/hour.',
          nutrition_after: '3:1 Ratio: 3 parts carbohydrate to 1 part protein. A recovery drink is ideal to manage fluid loss.'
        },
        'Competitive': {
          mistake: 'Middle-Mile Fade: Losing mental focus when initial excitement wears off but the finish is still distant.',
          strategy: 'Maintain perfectly even effort. Target a slight negative split by finishing the last 3 miles faster.',
          mindset: 'Even is fast: Fluctuations in pace are expensive. A rock-steady rhythm is the most efficient way to a PR. Become a metronome.',
          nutrition_before: 'Full Carb Prep: 48-hour high-carb protocol (8-10g/kg). Small carb snack 1 hour before the start.',
          nutrition_during: 'Carb Intake: Target 60–75g of carbohydrates per hour using a mix of gels and sports drink.',
          nutrition_after: 'Recovery Meal: Balanced meal (protein/complex carbs) within 2 hours. Focus on hydration and electrolytes.'
        },
        'Elite': {
          mistake: 'Tactical vs Physiological: Balancing your body\'s hard limits against race positioning and surges.',
          strategy: 'Pace primarily by internal effort levels. Initiate your final competitive surge late in the race.',
          mindset: 'Earn the last 10K: The first 11K is the commute; the final 10K is the job. You have to arrive at the 11K mark fresh enough to start working.',
          nutrition_before: 'Elite Protocol: Precision 48-72 hour carb load. Liquid carbs 2 hours pre-race to minimize GI weight.',
          nutrition_during: 'High Carb: Target 75–90g of carbs per hour. Train your gut in advance to handle this high volume.',
          nutrition_after: 'Rapid Refuel: 1.2g/kg of carbs + 25g protein immediately. Continue high-carb intake for 4 hours.'
        },
      },

      'Full Marathon': {
        'Recreational': {
          mistake: 'Glycogen Depletion: \'Hitting the wall\' due to insufficient fueling or overly aggressive early pacing.',
          strategy: 'Run a very conservative first half. Focus heavily on early fueling and staying relaxed.',
          mindset: 'Fuel early, finish upright: Think of yourself as a hybrid car. If you run out of "battery" (glycogen), the engine stops. Eat early and often so you can walk tall across the line.',
          nutrition_before: '48-Hr Carb Focus: Consistent high-carb meals for 2 full days. Prioritize low-fiber carbs like white rice or pasta.',
          nutrition_during: 'Fueling: Target 40–60g of carbs per hour. Start early (Mile 3) and be consistent. Don\'t wait for hunger.',
          nutrition_after: 'Aggressive Refeed: High calorie, high carb intake for 24 hours to address the massive energy deficit.'
        },
        'Intermediate': {
          mistake: 'Late-Race Fade: Seeing your pace plummet after mile 20 due to muscle damage or fueling failure.',
          strategy: 'Do nothing \'heroic\' or fast before mile 20. Protect your legs for the true race in the final 10K.',
          mindset: 'Protect the last 10K: The marathon is a 20-mile warm-up for a 6.2-mile race. If you feel like a hero at mile 10, you are doing it wrong. Stay anonymous until mile 20.',
          nutrition_before: 'Protocol: Full carb load + sodium loading (1500mg+) 2 hours before to expand plasma volume.',
          nutrition_during: 'Fueling: Target 60–70g of carbs per hour. Use a mix of glucose and fructose for better absorption.',
          nutrition_after: 'Recovery: High protein (30g) for muscle repair + aggressive sodium replacement to restore balance.'
        },
        'Competitive': {
          mistake: 'Overconfidence: Thinking you can \'bank time\' early. Banked time is usually borrowed from the final 10K.',
          strategy: 'Maintain even effort throughout. Focus on protecting your pace and form for the final 10K.',
          mindset: 'Discipline wins: The race will try to tempt you to go faster in the first half. Resist. The most disciplined runner on the course is usually the one who achieves their goal.',
          nutrition_before: 'Full Protocol: Scientific carb loading (10g/kg) and pre-race hydration with electrolytes.',
          nutrition_during: 'Fueling: Target 70–90g of carbs per hour. Focus on high-carb liquid and gel sources. Add sodium.',
          nutrition_after: 'Immediate: 50-75g of high-GI carbs immediately post-finish to replenish depleted glycogen.'
        },
        'Elite': {
          mistake: 'Marginal Errors Compound: Small pacing or fueling mistakes that grow into massive problems in the final hour.',
          strategy: 'Utilize precision effort-based pacing. Focus on total running efficiency and movement quality.',
          mindset: 'Efficiency wins: At this speed, aerodynamic drag and mechanical efficiency are everything. Keep your stride compact and your upper body still. Don\'t fight the road.',
          nutrition_before: 'Elite Protocol: Precision 48-72 hour carb load. Liquid carbs 2 hours pre-race to minimize GI weight.',
          nutrition_during: 'Elite Fueling: 90g+ of carbs per hour via hydrogel or liquid fuel. Requires highly trained GI system.',
          nutrition_after: 'Elite Reload: High-GI carbs immediately, followed by structured carb intake every 30 mins for 2 hours.'
        },
      },

      '50 Mile Ultra': {
        'Recreational': {
          mistake: 'GI Tolerance: Nausea or stomach shutdown caused by poor pacing or incorrect nutrient mix.',
          strategy: 'Incorporate walking on hills early. Maintain a steady, manageable jog on flats and descents.',
          mindset: 'Eat before hungry: In an ultra, your stomach is the boss. If it shuts down, your legs follow. Keep the "conveyor belt" of calories moving even when you don\'t feel like it.',
          nutrition_before: 'Ultra Prep: 3 days of high-carb, very low fiber intake to prevent GI distress. Big breakfast 4 hours before.',
          nutrition_during: 'Ultra Fuel: Target 200–250 calories per hour. Prioritize real food early, transitioning to gels/liquids late.',
          nutrition_after: 'Ultra Recovery: Small, carb-rich frequent meals for 6-12 hours post-race. Listen to your gut.'
        },
        'Intermediate': {
          mistake: 'Pacing Discipline: The difficulty of staying slow early when you feel strong, leading to late-race collapse.',
          strategy: 'Run a very conservative first 25 miles. Save your mental and physical energy for the second half.',
          mindset: 'Smooth beats strong: Aggressive running on technical terrain is fun for 10 miles but deadly for 50. Aim for a "liquid" movement style that preserves your quads for the final 15 miles.',
          nutrition_before: 'Ultra Prep: Targeted carb loading plus high sodium intake to prepare for massive sweat loss.',
          nutrition_during: 'Ultra Fuel: Target 250–300 calories per hour. Include sodium (500mg+/hr) and small amounts of protein.',
          nutrition_after: 'Rehydration: Drink 1.5L of fluid for every 1kg of weight lost. Include high sodium and carbs.'
        },
        'Competitive': {
          mistake: 'Heat and Fueling: Managing core temperature while maintaining a high caloric intake.',
          strategy: 'Maintain a consistent power output, adapting your pace to the terrain and environmental heat.',
          mindset: 'Relentless motion: Don\'t let your transitions or aid stations become "picnics." Minimize the time your feet aren\'t moving toward the finish line. Constant, steady movement is your goal.',
          nutrition_before: 'Carb Optimized: Precision carb loading protocol tailored to your sweat rate and body weight 24-48 hours out.',
          nutrition_during: 'High Calorie: Target 300+ calories per hour. High precision with electrolytes is required to prevent GI issues.',
          nutrition_after: 'Full Recovery: High carb/protein meal within 1 hour. Prioritize anti-inflammatory foods and hydration.'
        },
        'Elite': {
          mistake: 'Sleep and Efficiency: Maintaining focus and movement quality through extreme fatigue and overnight hours.',
          strategy: 'Execute high-precision pacing from the start. Manage every mile to ensure maximal speed.',
          mindset: 'Calories equal speed: You aren\'t just an athlete; you are a combustion engine. Your ability to process fuel under high aerobic stress is what separates the podium from the pack.',
          nutrition_before: 'Scientific Load: Precision 3-day taper and carb load. Individualized sodium loading based on sweat test.',
          nutrition_during: 'Elite Ultra: 300–350 calories per hour. High reliance on liquid nutrition to maintain speed.',
          nutrition_after: 'Structured Rebuild: Scientific recovery protocol focusing on amino acids, high-GI carbs, and sleep.'
        },
      },

      '100 Mile Ultra': {
        'Recreational': {
          mistake: 'Completion: Managing the overwhelming mental and physical distance just to cross the finish line.',
          strategy: 'Walk all inclines early. Focus on foot hygiene and protecting your feet from blisters and hotspots.',
          mindset: 'Forward is success: In a 100-miler, things will go wrong. Your job isn\'t to be perfect; it\'s to solve the problem and keep moving forward. One mile at a time.',
          nutrition_before: '100M Prep: Focus on carb-heavy meals for 4 days. Final meal should be substantial but 4 hours before start.',
          nutrition_during: 'Ultra Fuel: Target 200–250 calories per hour. Prioritize real food early, transitioning to gels/liquids late.',
          nutrition_after: 'Long Recovery: Focus on nutrient-dense meals and hydration for 3-5 days. Avoid intense activity.'
        },
        'Intermediate': {
          mistake: 'Sleep Deprivation: Hallucinations and cognitive decline during the second night on trail.',
          strategy: 'Implement strict run/walk cycles from the start. Solve physical or mental problems early before they grow.',
          mindset: 'Solve problems early: A small blister at mile 30 is a DNF at mile 80. A slight sour stomach at noon is a disaster at midnight. Fix every issue the moment it appears.',
          nutrition_before: 'Protocol: High carb load combined with aggressive electrolyte loading to prepare for multi-day stress.',
          nutrition_during: 'Ultra Fuel: Target 250–300 calories per hour. Include sodium (500mg+/hr) and small amounts of protein.',
          nutrition_after: 'Multi-Day Rebuild: High protein/carb focus for 72 hours. Supplement with antioxidants and electrolytes.'
        },
        'Competitive': {
          mistake: 'Mental Fatigue: Losing the \'will to move\' and wasting excessive time at aid stations.',
          strategy: 'Focus on high-speed, efficient aid station transitions. Minimize time spent sitting or idle.',
          mindset: 'Nothing wasted: Every minute you spend sitting in a chair is a minute you aren\'t racing. Treat aid stations like pit stops in Formula 1. Get in, get out, get gone.',
          nutrition_before: 'Carb Optimized: Precision carb loading protocol tailored to your sweat rate and body weight 24-48 hours out.',
          nutrition_during: 'Elite Ultra: 300–350 calories per hour. High reliance on liquid nutrition to maintain speed.',
          nutrition_after: 'Aggressive Refeed: High calorie, high carb intake for 24 hours to address the massive energy deficit.'
        },
        'Elite': {
          mistake: 'Entropy management',
          strategy: 'Precision execution',
          mindset: 'Manage entropy: The race is a battle against the second law of thermodynamics. Systems will break, calories will fail, and focus will slip. Your only job is to slow the rate of decay.',
          nutrition_before: 'Scientific Protocol: Scientific carb loading (10g/kg) and pre-race hydration with electrolytes.',
          nutrition_during: 'Elite Protocol: 350+ calories per hour. Precision timing to manage systemic energy levels.',
          nutrition_after: 'Structured Rebuild: Scientific recovery protocol focusing on amino acids, high-GI carbs, and sleep.'
        },
      },

    };
    
    // For running races, return athlete-level-specific strategy
    if (strategies[raceType] && typeof strategies[raceType] === 'object' && strategies[raceType][athleteLevel]) {
      return strategies[raceType][athleteLevel];
    }
    
    // Fallback to Intermediate if athlete level not found
    if (strategies[raceType] && strategies[raceType]['Intermediate']) {
      return strategies[raceType]['Intermediate'];
    }
    
    // Final fallback
    return strategies['Olympic Triathlon'] ? strategies['Olympic Triathlon']['Intermediate'] : {};
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
      'Full Marathon': { runHR: 0.86, runPower: 0.92, runPace: 0.87, rpe: '7/10' },
      '50 Mile Ultra': { runHR: 0.80, runPower: 0.80, runPace: 0.75, rpe: '5-6/10' },
      '100 Mile Ultra': { runHR: 0.75, runPower: 0.75, runPace: 0.70, rpe: '4-5/10' }
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
    
    const strategy = getRaceStrategy(formData.raceType, formData.athleteLevel);if (!strategy) {
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
    if (!results || raceTypes[results.raceType].type !== 'triathlon') {
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

    // Get default transition times
    const defaultTransitions = getTransitionTimes(results.raceType);
    
    // For target time approach, use the calculated t1/t2 times if available
    let baseT1 = defaultTransitions.t1;
    let baseT2 = defaultTransitions.t2;
    
    if (results.approach === 'target') {
      // Target time has specific t1/t2 target times calculated
      if (results.t1 && results.t1.targetTime) {
        baseT1 = timeToSeconds(results.t1.targetTime);
      }
      if (results.t2 && results.t2.targetTime) {
        baseT2 = timeToSeconds(results.t2.targetTime);
      }
    }

    // Calculate swim time
    const swimPaceSeconds = whatIf.swimPace || paceToSeconds(results.swim.targetPace);
    const swimDistanceYards = swimDistances[results.raceType] * 1760;
    const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;

    // Calculate T1 (use slider value or base from results)
    const t1Time = whatIf.t1Time || baseT1;

    // Calculate bike time
    const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed || results.bike.requiredSpeed;
    const bikeTime = (bikeDistances[results.raceType] / bikeSpeed) * 3600;

    // Calculate T2 (use slider value or base from results)
    const t2Time = whatIf.t2Time || baseT2;

    // Calculate run time
    const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace || results.run.requiredPace);
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

Strategy: ${results.strategy.swim ? results.strategy.swim.strategy : 'Focus on efficient technique'}
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

Strategy: ${results.strategy.bike ? results.strategy.bike.strategy : 'Maintain steady power output'}
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

Strategy: ${results.strategy.run ? results.strategy.run.strategy : 'Pace by effort and heart rate'}
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
`;

    // Add race execution strategy if available
    if (results.strategy.strategy) {
      content += `
RACE EXECUTION STRATEGY
${'-'.repeat(60)}
${results.strategy.strategy}
`;
    }

    content += `
PRIMARY MISTAKE TO AVOID
${'-'.repeat(60)}
${results.strategy.mistake}

KEY MINDSET
${'-'.repeat(60)}
${results.strategy.mindset}
`;

    // Add nutrition guidance for running races with athlete-level strategies
    if (results.strategy.nutrition_before) {
      content += `
NUTRITION STRATEGY
${'-'.repeat(60)}

Before the Race:
${results.strategy.nutrition_before}

During the Race:
${results.strategy.nutrition_during}

After the Race:
${results.strategy.nutrition_after}
`;
    }

    content += `
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
                <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                  Email Address <span style={{ color: colors.primary }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
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
                  {['5K Run', '10K Run', 'Half Marathon', 'Full Marathon', '50 Mile Ultra', '100 Mile Ultra'].map(race => (
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
              
              {/* Athlete Level Selection - For BOTH approaches */}
              {formData.pacingApproach && (
                <div style={{ marginTop: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', color: colors.charcoal, fontWeight: '700' }}>
                    YOUR ATHLETE LEVEL
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
                    This helps us tailor your pacing strategy to your experience and training volume
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
                          {formData.pacingApproach === 'fitness' && (
                            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.primary, background: `${colors.primary}15`, padding: '3px 8px', borderRadius: '4px' }}>
                              {pct} threshold
                            </div>
                          )}
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
                  disabled={!formData.pacingApproach || !formData.athleteLevel}
                  style={{
                    flex: 2,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: (formData.pacingApproach && formData.athleteLevel) ? colors.primary : '#cccccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (formData.pacingApproach && formData.athleteLevel) ? 'pointer' : 'not-allowed',
                    boxShadow: (formData.pacingApproach && formData.athleteLevel) ? `0 6px 20px ${colors.primary}60` : 'none',
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
                  {formData.raceType === '50 Mile Ultra' && (
                    <>
                      <div>• Sub-12:00:00 (finish)</div>
                      <div>• Sub-10:00:00 (competitive)</div>
                      <div>• Sub-8:00:00 (advanced)</div>
                      <div>• Sub-7:00:00 (elite)</div>
                    </>
                  )}
                  {formData.raceType === '100 Mile Ultra' && (
                    <>
                      <div>• Sub-30:00:00 (finish)</div>
                      <div>• Sub-24:00:00 (competitive)</div>
                      <div>• Sub-20:00:00 (advanced)</div>
                      <div>• Sub-18:00:00 (elite)</div>
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
              
              <form
                action={FORMSPREE_ENDPOINT}
                method="POST"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Submit to Formspree
                  fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    body: new FormData(e.target),
                    headers: { 'Accept': 'application/json' }
                  });
                  // Then show results
                  nextStep();
                }}
              >
                {/* Hidden inputs with all collected data */}
                <input type="hidden" name="email" value={formData.email} />
                <input type="hidden" name="raceType" value={formData.raceType} />
                <input type="hidden" name="pacingApproach" value={formData.pacingApproach} />
                <input type="hidden" name="targetTime" value={formData.targetTime} />
                <input type="hidden" name="age" value={formData.age} />
                <input type="hidden" name="gender" value={formData.gender} />
                <input type="hidden" name="athleteLevel" value={formData.athleteLevel} />
                <input type="hidden" name="calculatorType" value="Race Pacing Calculator" />
                <input type="hidden" name="_subject" value="New Race Pacing Strategy Request" />
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                  <button type="button" onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                    ← BACK
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.targetTime}
                    style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: formData.targetTime ? colors.primary : '#cccccc', color: 'white', border: 'none', borderRadius: '12px', cursor: formData.targetTime ? 'pointer' : 'not-allowed', boxShadow: formData.targetTime ? `0 6px 20px ${colors.primary}60` : 'none', letterSpacing: '0.5px' }}
                  >
                    GET MY STRATEGY →
                  </button>
                </div>
              </form>
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
                <label htmlFor="maxHR" style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px', display: 'block' }}>
                  Max Heart Rate
                </label>
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
                  <input type="number" id="maxHR" name="maxHR" value={formData.maxHR} onChange={(e) => updateFormData('maxHR', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 185" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
                {formData.maxHRKnown === false && (
                  <div style={{ padding: '12px', background: 'white', borderRadius: '8px', fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Will calculate based on age and gender
                  </div>
                )}
              </div>

              {/* Resting HR */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px' }}>
                <label htmlFor="restingHR" style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px', display: 'block' }}>
                  Resting Heart Rate (for better threshold calculation)
                </label>
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
                  <input type="number" id="restingHR" name="restingHR" value={formData.restingHR} onChange={(e) => updateFormData('restingHR', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 55" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
              </div>

              {/* TRIATHLON SPECIFIC */}
              {raceTypes[formData.raceType].type === 'triathlon' && (
                <>
                  {/* Swim CSS */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: '2px solid #e3f2fd' }}>
                    <label htmlFor="css" style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px', display: 'block' }}>
                      SWIM: Critical Swim Speed (CSS)
                    </label>
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
                        <input type="text" id="css" name="css" value={formData.css} onChange={(e) => updateFormData('css', e.target.value)} placeholder="e.g., 1:30" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.cssKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's your fastest 100-yard swim time? (MM:SS)</label>
                        <input type="text" id="fastest100y" name="fastest100y" value={formData.fastest100y} onChange={(e) => updateFormData('fastest100y', e.target.value)} placeholder="e.g., 1:45" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                          We'll calculate CSS as 85% of your fastest 100y time
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bike FTP */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px', border: '2px solid #fff3e0' }}>
                    <label htmlFor="ftp" style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px', display: 'block' }}>
                      BIKE: Functional Threshold Power (FTP)
                    </label>
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
                        <input type="number" id="ftp" name="ftp" value={formData.ftp} onChange={(e) => updateFormData('ftp', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 250" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.ftpKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Maximum watts you can hold for 20 minutes</label>
                        <input type="number" id="max20minWatts" name="max20minWatts" value={formData.max20minWatts} onChange={(e) => updateFormData('max20minWatts', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 270" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
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
                <label htmlFor="thresholdPace" style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px', display: 'block' }}>
                  RUN: Threshold Pace
                </label>
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
                    <input type="text" id="thresholdPace" name="thresholdPace" value={formData.thresholdPace} onChange={(e) => updateFormData('thresholdPace', e.target.value)} placeholder="e.g., 8:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                  </div>
                )}
                {formData.thresholdPaceKnown === false && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's the fastest 5K you can run today? (MM:SS)</label>
                    <input type="text" id="fastest5K" name="fastest5K" value={formData.fastest5K} onChange={(e) => updateFormData('fastest5K', e.target.value)} placeholder="e.g., 24:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
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
                <input type="number" id="thresholdPower" name="thresholdPower" value={formData.thresholdPower} onChange={(e) => updateFormData('thresholdPower', e.target.value)} onWheel={(e) => e.target.blur()} placeholder="e.g., 285 (leave blank if no Stryd)" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
              </div>

              <form
                action={FORMSPREE_ENDPOINT}
                method="POST"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Submit to Formspree
                  fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    body: new FormData(e.target),
                    headers: { 'Accept': 'application/json' }
                  });
                  // Then show results
                  nextStep();
                }}
              >
                {/* Hidden inputs with all collected data */}
                <input type="hidden" name="email" value={formData.email} />
                <input type="hidden" name="raceType" value={formData.raceType} />
                <input type="hidden" name="pacingApproach" value={formData.pacingApproach} />
                <input type="hidden" name="age" value={formData.age} />
                <input type="hidden" name="gender" value={formData.gender} />
                <input type="hidden" name="athleteLevel" value={formData.athleteLevel} />
                <input type="hidden" name="maxHR" value={formData.maxHR} />
                <input type="hidden" name="restingHR" value={formData.restingHR} />
                <input type="hidden" name="css" value={formData.css} />
                <input type="hidden" name="ftp" value={formData.ftp} />
                <input type="hidden" name="thresholdPace" value={formData.thresholdPace} />
                <input type="hidden" name="calculatorType" value="Race Pacing Calculator" />
                <input type="hidden" name="_subject" value="New Race Pacing Strategy Request" />
                              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button type="button" onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button type="submit"
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
              </form>
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
                        <strong>Strategy:</strong> {results.strategy.swim ? results.strategy.swim.strategy : 'Focus on efficient technique'}
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
                        <strong>Strategy:</strong> {results.strategy.bike ? results.strategy.bike.strategy : 'Maintain steady power output'}
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
                        <strong>Strategy:</strong> {results.strategy.run ? results.strategy.run.strategy : 'Pace by effort and heart rate'}
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
                          <label htmlFor="swimPaceSlider" style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Swimming</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToPace(whatIf.swimPace || paceToSeconds(results.swim.targetPace))}/100y
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            id="swimPaceSlider"
                            name="swimPaceSlider"
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
                          <label htmlFor="t1TimeSlider" style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>T1 (Swim-to-Bike)</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToTime(whatIf.t1Time || getTransitionTimes(results.raceType).t1)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            id="t1TimeSlider"
                            name="t1TimeSlider"
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
                          <label htmlFor="bikeSpeedSlider" style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Cycling</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {(whatIf.bikeSpeed || results.bike.estimatedSpeed || results.bike.requiredSpeed).toFixed(1)} mph
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            id="bikeSpeedSlider"
                            name="bikeSpeedSlider"
                            min={(results.bike.estimatedSpeed || results.bike.requiredSpeed) * 0.7}
                            max={(results.bike.estimatedSpeed || results.bike.requiredSpeed) * 1.3}
                            step="0.1"
                            value={whatIf.bikeSpeed || results.bike.estimatedSpeed || results.bike.requiredSpeed}
                            onChange={(e) => updateWhatIf('bikeSpeed', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={(() => {
                              const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed || results.bike.requiredSpeed;
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
                          <label htmlFor="t2TimeSlider" style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>T2 (Bike-to-Run)</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToTime(whatIf.t2Time || getTransitionTimes(results.raceType).t2)}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            id="t2TimeSlider"
                            name="t2TimeSlider"
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
                          <label htmlFor="runPaceSlider" style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>Running</label>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>
                            {secondsToPace(whatIf.runPace || paceToSeconds(results.run.estimatedPace || results.run.requiredPace))}/mi
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="range"
                            id="runPaceSlider"
                            name="runPaceSlider"
                            min={paceToSeconds(results.run.estimatedPace || results.run.requiredPace) * 0.7}
                            max={paceToSeconds(results.run.estimatedPace || results.run.requiredPace) * 1.3}
                            step="1"
                            value={whatIf.runPace || paceToSeconds(results.run.estimatedPace || results.run.requiredPace)}
                            onChange={(e) => updateWhatIf('runPace', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            value={(() => {
                              const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace || results.run.requiredPace);
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
                                const bikeSpeed = whatIf.bikeSpeed || results.bike.estimatedSpeed || results.bike.requiredSpeed;
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
                                const runPace = whatIf.runPace || paceToSeconds(results.run.estimatedPace || results.run.requiredPace);
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
                </div>
              )}

              {/* RACE EXECUTION STRATEGY - Blue Box */}
              {results.strategy.strategy && (
                <div style={{ marginBottom: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '12px', border: '2px solid #2196f3' }}>
                  <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                    RACE EXECUTION STRATEGY
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal }}>
                    {results.strategy.strategy}
                  </p>
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

              {/* NUTRITION GUIDANCE (for running races with athlete-level strategies) */}
              {results.strategy.nutrition_before && (
                <div style={{ marginBottom: '30px', padding: '20px', background: '#e8f5e9', borderRadius: '12px', border: '2px solid #66bb6a' }}>
                  <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '15px', fontWeight: '700' }}>
                    NUTRITION STRATEGY
                  </h3>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '15px', color: colors.charcoal, marginBottom: '6px', fontWeight: '600' }}>
                      Before the Race:
                    </h4>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal }}>
                      {results.strategy.nutrition_before}
                    </p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '15px', color: colors.charcoal, marginBottom: '6px', fontWeight: '600' }}>
                      During the Race:
                    </h4>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal }}>
                      {results.strategy.nutrition_during}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', color: colors.charcoal, marginBottom: '6px', fontWeight: '600' }}>
                      After the Race:
                    </h4>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal }}>
                      {results.strategy.nutrition_after}
                    </p>
                  </div>
                </div>
              )}

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
