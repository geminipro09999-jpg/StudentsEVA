const fs = require('fs');

const usersText = `Yapes Nixon                                                yapes@eval.com
Thifshana Jeyabalan                                  thifshana@eval.com
Thenushan Suresh                                     thenushan@eval.com
Tharijanan Arunthavaseelan                    tharijanan@eval.com
Suresh Kirusthiya                                       kirusthiya@eval.com
Suntharalingam Sutharsan                       sutharsan@eval.com
Sivakumar Sanjeevan                                sanjeevan@eval.com
Shankavi vijayakumar                                shankavi@eval.com
Saludeen Mohamed Rowsas                    rowsas@eval.com
Saif Ahmed                                                  saif@eval.com
Saboor Mohaideen Abdul Baasith          baasith@eval.com
Regunathan Dhanushkar                          dhanushkar@eval.com
Ramanathan Danuharan                           danuharan@eval.com
Rajasekaram Mathusan                            mathusan@eval.com
Poovilingam Thamsan                               thamsan@eval.com
Parameshwararaj Yadhurshana              yadhurshana@eval.com
Parameshwararaj Kavishna                      kavishna@eval.com
Paramananthan Thanuraj                         thanuraj@eval.com
Paramananthan Dapiyshanth                  dapi@eval.com
Nobert Nilaxshan                                       nilaxshan@eval.com
Nivethiga Sivakadacham                           nivethiga@eval.com
Ms.Dharsika Satchithanantham              dharsika@eval.com
Mathiyalagan Pirakeerthan                      pirakeerthanan@eval.com
Mahendran kajaatharan                           kaja@eval.com
Lavanya Jegathasa                                     lavanya@eval.com
kunasika Thiyakarasa                                 kunasika@eval.com
Kalaimakan Gobithas                                 kalai@eval.com
Eswaran Tharmithan                                 tharmithan@eval.com
Enok bilshan                                                enok@eval.com
Ashokkumar Natheesan                            natheesan@eval.com
Aravinthan Thivaharan                              thivaharan@eval.com
Abitha Amirthalingam                               abitha@eval.com`;

const lines = usersText.split('\n');
const values = lines.map(line => {
    let parts = line.trim().split(/\s{2,}/);
    if(parts.length < 2) return null;
    let name = parts[0].trim().replace(/'/g, "''");
    let email = parts[1].trim();
    // Default password hash for Admin@123
    let password = '$2b$10$51OHkCA0ITuqE0uR2JQQmug5AOihu8EKa/MRTRJWVbeoms1jY5yTy';
    return `('${name}', '${email}', '${password}', 'incubator_staff', ARRAY['incubator_staff'], ARRAY['monthly'])`;
}).filter(x => x);

const sql = `INSERT INTO public.users (name, email, password, role, roles, payment_methods) VALUES \n` + values.join(',\n') + `\nON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, roles = EXCLUDED.roles, payment_methods = EXCLUDED.payment_methods;`;

fs.writeFileSync('insert_users.sql', sql);
console.log('SQL generated successfully.');
