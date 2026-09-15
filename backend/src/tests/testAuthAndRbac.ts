import { generateToken } from '../utils/security';
import { prisma } from '../prisma/client';

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runAuthTests() {
  console.log('============================================================');
  console.log('🛡️  MINDBRIDGE AUTHENTICATION & AUTHORIZATION TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST GROUP 1: Valid Login Across Multiple Roles
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1: Valid Login Across Roles ---');

    // 1.1 Student Login
    const studentLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'aarav.patel@aiths.ac.in', password: 'Password123!' },
    });
    assert(studentLogin.status === 200 && studentLogin.data.success, 'Student login successful (200 OK)');
    assert(studentLogin.data.data?.user?.role === 'STUDENT', 'Student JWT payload role is STUDENT');
    const studentToken = studentLogin.data.data.token;

    // 1.2 Counsellor Login
    const counsellorLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'dr.ananya@aiths.ac.in', password: 'Password123!' },
    });
    assert(counsellorLogin.status === 200 && counsellorLogin.data.data?.user?.role === 'COUNSELLOR', 'Counsellor login successful (role=COUNSELLOR)');
    const counsellorToken = counsellorLogin.data.data.token;

    // 1.3 Institution Admin Login
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'dean.welfare@aiths.ac.in', password: 'Password123!' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.data?.user?.role === 'INSTITUTION_ADMIN', 'Institution Admin login successful (role=INSTITUTION_ADMIN)');
    const adminToken = adminLogin.data.data.token;

    // -------------------------------------------------------------
    // TEST GROUP 2: Invalid Login Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Invalid Login Handling ---');

    // 2.1 Bad password
    const badPassword = await req('/auth/login', {
      method: 'POST',
      body: { email: 'aarav.patel@aiths.ac.in', password: 'WrongPassword999!' },
    });
    assert(badPassword.status === 401 && badPassword.data.error.code === 'INVALID_CREDENTIALS', 'Rejects incorrect password with 401 INVALID_CREDENTIALS');

    // 2.2 Non-existent email
    const nonExistent = await req('/auth/login', {
      method: 'POST',
      body: { email: 'ghost.student@aiths.ac.in', password: 'Password123!' },
    });
    assert(nonExistent.status === 401 && nonExistent.data.error.code === 'INVALID_CREDENTIALS', 'Rejects non-existent email with generic 401 INVALID_CREDENTIALS');

    // -------------------------------------------------------------
    // TEST GROUP 3: Unauthorized API Access
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Unauthorized API Access ---');

    // 3.1 Protected endpoint without token
    const noToken = await req('/auth/me');
    assert(noToken.status === 401 && noToken.data.error.code === 'UNAUTHORIZED', 'Missing Authorization header rejected with 401 UNAUTHORIZED');

    // 3.2 Malformed token
    const malformedToken = await req('/auth/me', {
      headers: { Authorization: 'Bearer not-a-valid-jwt-token' },
    });
    assert(malformedToken.status === 401 && malformedToken.data.error.code === 'TOKEN_INVALID', 'Malformed token rejected with 401 TOKEN_INVALID');

    // -------------------------------------------------------------
    // TEST GROUP 4: Role Escalation & RBAC Boundary Enforcement
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Role Escalation & RBAC Boundary Enforcement ---');

    // 4.1 Student attempting to access Admin Analytics overview
    const studentEscalateAdmin = await req('/analytics/overview', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentEscalateAdmin.status === 403 && studentEscalateAdmin.data.error.code === 'FORBIDDEN_ROLE', 'Student blocked from Admin Analytics with 403 FORBIDDEN_ROLE');

    // 4.2 Student attempting to set Counsellor Availability
    const studentEscalateCounsellor = await req('/counsellors/availability', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    });
    assert(studentEscalateCounsellor.status === 403 && studentEscalateCounsellor.data.error.code === 'FORBIDDEN_ROLE', 'Student blocked from Counsellor Availability with 403 FORBIDDEN_ROLE');

    // 4.3 Self-assignment privilege escalation during registration
    const escalateRegistration = await req('/auth/register', {
      method: 'POST',
      body: {
        email: 'malicious.actor@aiths.ac.in',
        password: 'Password123!',
        firstName: 'Malicious',
        lastName: 'Actor',
        role: 'SUPER_ADMIN',
      },
    });
    assert(escalateRegistration.status === 403 && escalateRegistration.data.error.code === 'CANNOT_SELF_ASSIGN_PRIVILEGED_ROLE', 'Blocked self-assignment of SUPER_ADMIN role with 403 CANNOT_SELF_ASSIGN_PRIVILEGED_ROLE');

    // 4.4 Authorized Admin accessing Admin Analytics
    const adminAllowed = await req('/analytics/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllowed.status === 200 && adminAllowed.data.success, 'Institution Admin successfully authorized for Admin Analytics (200 OK)');

    // -------------------------------------------------------------
    // TEST GROUP 5: Expired Session Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Expired Session Handling ---');

    // Generate token that expired 10 seconds ago
    const expiredToken = generateToken(
      {
        userId: studentLogin.data.data.user.id,
        email: 'aarav.patel@aiths.ac.in',
        role: 'STUDENT',
        institutionId: studentLogin.data.data.user.institution.id,
      },
      -10 // Expired 10 seconds ago
    );

    const expiredAccess = await req('/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredAccess.status === 401 && expiredAccess.data.error.code === 'TOKEN_EXPIRED', 'Expired session token rejected with 401 TOKEN_EXPIRED');

    // -------------------------------------------------------------
    // TEST GROUP 6: Malformed Input Validation (Zod Guard)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Malformed Input Validation ---');

    // 6.1 Invalid email format
    const badEmail = await req('/auth/register', {
      method: 'POST',
      body: {
        email: 'not-an-email-address',
        password: 'Password123!',
        firstName: 'Valid',
        lastName: 'User',
      },
    });
    assert(badEmail.status === 400 && badEmail.data.error.code === 'VALIDATION_ERROR', 'Registration rejects invalid email with 400 VALIDATION_ERROR');

    // 6.2 Short password (<8 chars)
    const shortPassword = await req('/auth/register', {
      method: 'POST',
      body: {
        email: 'short.pw@aiths.ac.in',
        password: 'short',
        firstName: 'Valid',
        lastName: 'User',
      },
    });
    assert(shortPassword.status === 400 && shortPassword.data.error.code === 'VALIDATION_ERROR', 'Registration rejects password < 8 chars with 400 VALIDATION_ERROR');

    // -------------------------------------------------------------
    // TEST GROUP 7: Brute-Force Protection / Account Lockout
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Brute-force Login Protection ---');

    const targetEmail = `bruteforce.${Date.now()}@aiths.ac.in`;
    // Create a temporary user to test brute force against
    const tempReg = await req('/auth/register', {
      method: 'POST',
      body: {
        email: targetEmail,
        password: 'CorrectPassword123!',
        firstName: 'Brute',
        lastName: 'Target',
      },
    });
    assert(tempReg.status === 201, 'Created target test user for brute-force evaluation');

    // Attempt 5 consecutive invalid logins
    let lockoutTriggered = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
      const failResp = await req('/auth/login', {
        method: 'POST',
        body: { email: targetEmail, password: 'WrongPassword!' },
      });

      if (failResp.status === 429 && failResp.data.error.code === 'TOO_MANY_FAILED_ATTEMPTS') {
        lockoutTriggered = true;
        break;
      }
    }
    assert(lockoutTriggered, 'Account locked out after repeated failed logins with 429 TOO_MANY_FAILED_ATTEMPTS');

    // Even with correct password, login must be blocked during lockout window
    const blockedValidLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: targetEmail, password: 'CorrectPassword123!' },
    });
    assert(blockedValidLogin.status === 429, 'Locked account continues to block valid login during lockout window');

    // -------------------------------------------------------------
    // TEST GROUP 8: Logout & Token Revocation
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Logout & Session Invalidation ---');

    // Log in with second student to get fresh token
    const freshStudentLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'diya.sharma@aiths.ac.in', password: 'Password123!' },
    });
    const freshToken = freshStudentLogin.data.data.token;

    // Verify token works before logout
    const preLogoutCheck = await req('/auth/me', {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(preLogoutCheck.status === 200, 'Fresh token valid before logout');

    // Logout
    const logoutResp = await req('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(logoutResp.status === 200 && logoutResp.data.success, 'Logout endpoint terminates session (200 OK)');

    // Attempt to use revoked token
    const postLogoutCheck = await req('/auth/me', {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert(postLogoutCheck.status === 401 && postLogoutCheck.data.error.code === 'TOKEN_REVOKED', 'Revoked token rejected with 401 TOKEN_REVOKED');

    // -------------------------------------------------------------
    // TEST GROUP 9: Password Reset Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Password Reset Lifecycle ---');

    // 9.1 Request password reset
    const forgotResp = await req('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'kabir.verma@aiths.ac.in' },
    });
    assert(forgotResp.status === 200 && !!forgotResp.data.resetToken, 'Password reset token generated (200 OK)');
    const resetToken = forgotResp.data.resetToken;

    // 9.2 Reset password with new password
    const resetResp = await req('/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken,
        newPassword: 'NewSecurePassword123!',
      },
    });
    assert(resetResp.status === 200 && resetResp.data.success, 'Password successfully reset with valid token');

    // 9.3 Login with new password
    const newPwLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'kabir.verma@aiths.ac.in', password: 'NewSecurePassword123!' },
    });
    assert(newPwLogin.status === 200, 'Login succeeded with newly updated password');

    // 9.4 Reusing consumed reset token is rejected
    const reuseToken = await req('/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken,
        newPassword: 'AnotherPassword123!',
      },
    });
    assert(reuseToken.status === 400 && reuseToken.data.error.code === 'TOKEN_ALREADY_USED', 'Reusing consumed password reset token rejected with 400 TOKEN_ALREADY_USED');

    // -------------------------------------------------------------
    // TEST GROUP 10: Email Verification Architecture
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: Email Verification Architecture ---');

    // 10.1 Request email verification token
    const verifyReq = await req('/auth/verify-email/request', {
      method: 'POST',
      body: { email: 'tara.roy@aiths.ac.in' },
    });
    assert(verifyReq.status === 200 && !!verifyReq.data.verificationToken, 'Email verification token issued');
    const emailToken = verifyReq.data.verificationToken;

    // 10.2 Confirm email verification
    const verifyConfirm = await req('/auth/verify-email/confirm', {
      method: 'POST',
      body: { token: emailToken },
    });
    assert(verifyConfirm.status === 200 && verifyConfirm.data.success, 'Email verified successfully (200 OK)');

    // 10.3 Verify database state
    const verifiedUser = await prisma.user.findUnique({
      where: { email: 'tara.roy@aiths.ac.in' },
    });
    assert(verifiedUser?.isVerified === true, 'Database User.isVerified reflects true');

    // -------------------------------------------------------------
    // TEST GROUP 11: Audit Logging Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 11: Audit Logging Verification ---');
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    const loggedActions = new Set(recentAuditLogs.map((l) => l.action));
    assert(loggedActions.has('LOGIN_SUCCESS'), 'AuditLog captures LOGIN_SUCCESS');
    assert(loggedActions.has('LOGIN_FAILED'), 'AuditLog captures LOGIN_FAILED');
    assert(loggedActions.has('USER_LOGGED_OUT'), 'AuditLog captures USER_LOGGED_OUT');
    assert(loggedActions.has('UNAUTHORIZED_ROLE_ESCALATION_ATTEMPT'), 'AuditLog captures UNAUTHORIZED_ROLE_ESCALATION_ATTEMPT');

    console.log('\n============================================================');
    console.log(`🏁 AUTH & RBAC VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    try {
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'bruteforce' } },
      });
    } catch (e) {}
    await prisma.$disconnect();
  }
}

runAuthTests();
