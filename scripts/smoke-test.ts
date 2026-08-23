/**
 * Prueba de humo de punta a punta contra una API ya levantada.
 *
 *   bun run scripts/smoke-test.ts
 *   API_URL=http://localhost:3001/api bun run scripts/smoke-test.ts
 *
 * Recorre el flujo real: la directora crea sala, cuentas, profesora y alumno;
 * la profesora anota en la agenda; el padre ve esa anotacion y sus pagos.
 * Tambien comprueba que cada rol NO puede hacer lo que no le toca.
 *
 * Usa emails con marca de tiempo, asi que se puede ejecutar las veces que haga
 * falta sin limpiar la base.
 */
const API = process.env.API_URL ?? 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'directora@kidcare.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Directora123!';

const stamp = Date.now();
let failures = 0;

function check(ok: boolean, label: string, extra?: unknown) {
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}`);
  if (!ok) {
    failures++;
    if (extra !== undefined) console.log('     ', extra);
  }
}

async function call(
  path: string,
  { token, method = 'GET', body }: {
    token?: string;
    method?: string;
    body?: unknown;
  } = {},
) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function login(email: string, password: string) {
  const { status, data } = await call('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (status !== 200) {
    throw new Error(`login de ${email} fallo (${status}): ${JSON.stringify(data)}`);
  }
  return data.token as string;
}

console.log(`\n🧸 Prueba de humo contra ${API}\n`);

// --- 1. La directora entra --------------------------------------------------
console.log('1. Login de la directora');
const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
check(Boolean(admin), 'la directora obtiene un JWT');

const me = await call('/auth/me', { token: admin });
check(me.data?.user?.role === 'directora', 'GET /auth/me devuelve rol directora');

const noToken = await call('/children');
check(noToken.status === 401, 'sin token, /children responde 401');

// --- 2. Sala y cuentas ------------------------------------------------------
console.log('\n2. La directora crea sala, cuentas y ficha de profesora');
const levels = await call('/levels', { token: admin });
check(levels.data?.length >= 2, 'el seed dejo al menos 2 niveles');

const room = await call('/rooms', {
  token: admin,
  method: 'POST',
  body: {
    name: `Sala Arcoíris 🌈 ${stamp}`,
    levelId: levels.data[0].id,
    turn: 'manana',
    capacity: 10,
  },
});
check(room.status === 201, 'POST /rooms crea la sala', room.data);
const roomId = room.data.id;

const teacherUser = await call('/users', {
  token: admin,
  method: 'POST',
  body: {
    name: 'Marta López',
    email: `marta.${stamp}@kidcare.test`,
    password: 'Profesora123!',
    role: 'profesora',
  },
});
check(teacherUser.status === 201, 'POST /users crea la cuenta de profesora', teacherUser.data);

const parentUser = await call('/users', {
  token: admin,
  method: 'POST',
  body: {
    name: 'Javier Ruiz',
    email: `javier.${stamp}@kidcare.test`,
    password: 'Padre1234!',
    role: 'padre',
  },
});
check(parentUser.status === 201, 'POST /users crea la cuenta de padre', parentUser.data);

const teacher = await call('/teachers', {
  token: admin,
  method: 'POST',
  body: {
    userId: teacherUser.data.id,
    name: 'Marta López',
    specialty: 'Educación infantil',
    roomId,
    turn: 'manana',
  },
});
check(teacher.status === 201, 'POST /teachers vincula la cuenta con la sala', teacher.data);

// --- 3. Alumno --------------------------------------------------------------
console.log('\n3. La directora da de alta un alumno');
const child = await call('/children', {
  token: admin,
  method: 'POST',
  body: {
    name: `Lucía Fernández ${stamp}`,
    birthDate: '2024-03-15',
    levelId: levels.data[0].id,
    roomId,
    turn: 'manana',
    authorizedPickup: ['Abuela Rosa', 'Tío Marc'],
    allergies: 'Frutos secos',
    medications: null,
    observations: 'Duerme siesta larga',
    parentId: parentUser.data.id,
    monthlyFee: 320,
  },
});
check(child.status === 201, 'POST /children crea el alumno', child.data);
const childId = child.data.id;
check(child.data.room?.id === roomId, 'el alumno queda en la sala nueva');
check(
  Array.isArray(child.data.authorizedPickup) &&
    child.data.authorizedPickup.length === 2,
  'se guardan las personas autorizadas a recoger',
  child.data.authorizedPickup,
);

// --- 4. Pagos ---------------------------------------------------------------
console.log('\n4. La directora registra un pago y lo cobra');
const payment = await call('/payments', {
  token: admin,
  method: 'POST',
  body: {
    childId,
    amount: 320,
    months: ['2026-08'],
    status: 'pendiente',
  },
});
check(payment.status === 201, 'POST /payments crea la cuota pendiente', payment.data);

const paid = await call(`/payments/${payment.data.id}/pay`, {
  token: admin,
  method: 'PATCH',
  body: { method: 'transferencia' },
});
check(paid.status === 200 && paid.data.status === 'pagado', 'PATCH /payments/:id/pay la marca pagada', paid.data);

// --- 5. La profesora anota en la agenda -------------------------------------
console.log('\n5. La profesora entra y anota en la agenda diaria');
const teacherToken = await login(`marta.${stamp}@kidcare.test`, 'Profesora123!');

const teacherChildren = await call('/children', { token: teacherToken });
check(
  teacherChildren.data.length === 1 && teacherChildren.data[0].id === childId,
  'la profesora solo ve al alumno de SU sala',
  teacherChildren.data.map((c: { name: string }) => c.name),
);

const activity = await call('/activities', {
  token: teacherToken,
  method: 'POST',
  body: {
    childId,
    type: 'comida',
    description: 'Comió todo el puré y repitió 🍽️',
  },
});
check(activity.status === 201, 'POST /activities registra la anotación', activity.data);

const forbiddenChild = await call('/children', {
  token: teacherToken,
  method: 'POST',
  body: { name: 'No debería poder', birthDate: '2024-01-01' },
});
check(forbiddenChild.status === 403, 'la profesora NO puede crear alumnos (403)');

// --- 6. El padre lo ve ------------------------------------------------------
console.log('\n6. El padre entra y ve la agenda y sus pagos');
const parentToken = await login(`javier.${stamp}@kidcare.test`, 'Padre1234!');

const dash = await call('/dashboard', { token: parentToken });
check(dash.status === 200, 'GET /dashboard responde al padre', dash.data);
check(
  dash.data.children.length === 1 && dash.data.children[0].id === childId,
  'el padre ve exactamente a su hijo',
);
check(
  dash.data.recentActivities.some(
    (a: { id: string }) => a.id === activity.data.id,
  ),
  'el padre ve la anotación que hizo la profesora',
  dash.data.recentActivities,
);
check(
  dash.data.payments.some(
    (p: { id: string; status: string }) =>
      p.id === payment.data.id && p.status === 'pagado',
  ),
  'el padre ve su pago como pagado',
  dash.data.payments,
);

const notifications = await call('/notifications', { token: parentToken });
check(
  notifications.data.length >= 2,
  'el padre recibio notificaciones in-app de agenda y pago',
  notifications.data.map((n: { title: string }) => n.title),
);

const forbiddenActivity = await call('/activities', {
  token: parentToken,
  method: 'POST',
  body: { childId, type: 'comida', description: 'no' },
});
check(forbiddenActivity.status === 403, 'el padre NO puede escribir en la agenda (403)');

const forbiddenUsers = await call('/users', { token: parentToken });
check(forbiddenUsers.status === 403, 'el padre NO puede listar cuentas (403)');

// --- 7. Rate limiting en /auth/login -----------------------------------------
console.log('\n7. Rate limiting en /auth/login');
// Email desechable: nunca existe, asi que solo se prueba el limite por email
// sin arriesgar bloquear la cuenta real de la directora.
const rateLimitEmail = `ratelimit-${stamp}@kidcare.test`;
let lastLoginStatus = 0;
for (let i = 0; i < 6; i++) {
  const attempt = await call('/auth/login', {
    method: 'POST',
    body: { email: rateLimitEmail, password: 'password-incorrecta' },
  });
  lastLoginStatus = attempt.status;
}
check(
  lastLoginStatus === 429,
  'tras 6 intentos fallidos con el mismo email, /auth/login responde 429',
  lastLoginStatus,
);

// --- 8. Logout revoca el token inmediatamente --------------------------------
console.log('\n8. Logout revoca el token inmediatamente');
const parentToken2 = await login(`javier.${stamp}@kidcare.test`, 'Padre1234!');

const meBefore = await call('/auth/me', { token: parentToken2 });
check(meBefore.status === 200, 'el token funciona antes del logout', meBefore.data);

const logoutRes = await call('/auth/logout', {
  token: parentToken2,
  method: 'POST',
});
check(logoutRes.status === 200, 'POST /auth/logout responde 200', logoutRes.data);

const meAfter = await call('/auth/me', { token: parentToken2 });
check(
  meAfter.status === 401,
  'el mismo token ya no sirve tras el logout (revocado por jti)',
  meAfter.data,
);

// --- Resultado --------------------------------------------------------------
console.log(
  failures === 0
    ? '\n🎉 Todas las comprobaciones pasaron\n'
    : `\n💥 ${failures} comprobacion(es) fallaron\n`,
);
process.exit(failures === 0 ? 0 : 1);
