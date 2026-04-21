# ============================================================
# install.config.example.ps1
# ------------------------------------------------------------
# Copy file nay thanh install.config.ps1 va dien thong tin that.
# install.config.ps1 da duoc gitignore - KHONG commit secrets!
#
# Cach dung:
#   Copy-Item install.config.example.ps1 install.config.ps1
#   notepad install.config.ps1
# ============================================================

$Config = @{
    InstallDir      = "C:\MaisonDeluxe"
    ApiPort         = 8080

    Domain          = "your-domain.com"
    Email           = "your-email@example.com"

    # Database (Neon by default)
    UseLocalPg      = $false
    NeonDatabaseUrl = "postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
    PgSuperPassword = "CHANGE_ME"
    PgDbName        = "maisondeluxe"
    PgDbUser        = "maisondeluxe"
    PgDbPassword    = "CHANGE_ME"

    # Clerk (production keys) - lay tu https://dashboard.clerk.com
    ClerkPublishableKey = "pk_live_REPLACE_ME"
    ClerkSecretKey      = "sk_live_REPLACE_ME"

    # Momo
    MomoPartnerCode = "MOMO"
    MomoAccessKey   = "REPLACE_ME"
    MomoSecretKey   = "REPLACE_ME"
    MomoEndpoint    = "https://test-payment.momo.vn/v2/gateway/api/create"

    # Superadmin auto-seed: chen 1 dong vao bang user_roles tren Neon
    # de tai khoan Clerk nay co quyen vao admin (middleware requireAdmin).
    # De trong (chuoi rong) -> bo qua buoc seed.
    SuperAdminClerkId = ""
    SuperAdminEmail   = ""
    SuperAdminName    = ""

    NodeVersion     = "22.14.0"
    NodeMinMajor    = 20
    PgVersion       = "16"
    NginxVersion    = "1.26.3"
    MinRamGB        = 2
    MinDiskGB       = 10
}
