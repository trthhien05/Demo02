using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Demo02.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProfessionalReservationFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DiningTableId",
                table: "Reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ReminderSent",
                table: "Reservations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Reservations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_DiningTableId",
                table: "Reservations",
                column: "DiningTableId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_DiningTables_DiningTableId",
                table: "Reservations",
                column: "DiningTableId",
                principalTable: "DiningTables",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_DiningTables_DiningTableId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_DiningTableId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "DiningTableId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "ReminderSent",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Reservations");
        }
    }
}
