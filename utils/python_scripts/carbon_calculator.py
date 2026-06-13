import sys
import math

# Standard emission factors (Public constants for AI/ML pipelines)
ELEC_EMISSION_FACTOR = 0.85  # kg CO2e per kWh
CAR_EMISSION_FACTOR = 0.14   # kg CO2e per km

def calculate_carbon_footprint(electricity_kwh, vehicle_km):
    """
    Calculates the estimated carbon footprint based on standard emission factors.
    - Electricity: ~0.85 kg CO2e per kWh
    - Average Car: ~0.14 kg CO2e per km
    """
    # Parameter-specific validation for electricity
    if not math.isfinite(electricity_kwh):
        raise ValueError("electricity_kwh must be a finite number.")
    if electricity_kwh < 0:
        raise ValueError("electricity_kwh must be non-negative.")
        
    # Parameter-specific validation for vehicle distance
    if not math.isfinite(vehicle_km):
        raise ValueError("vehicle_km must be a finite number.")
    if vehicle_km < 0:
        raise ValueError("vehicle_km must be non-negative.")

    electricity_emissions = electricity_kwh * ELEC_EMISSION_FACTOR
    transport_emissions = vehicle_km * CAR_EMISSION_FACTOR
    
    total_emissions = electricity_emissions + transport_emissions
    return total_emissions, electricity_emissions, transport_emissions

def main():
    print("🌱 EcoVerse Offline Carbon Calculator 🌱")
    print("-" * 40)
    
    # 1. Safely get electricity input
    try:
        elec = float(input("Enter monthly electricity usage (in kWh): "))
    except ValueError:
        print("❌ Error: Please enter valid numeric values for electricity usage.")
        sys.exit(1)
        
    # 2. Safely get transport input
    try:
        trans = float(input("Enter monthly vehicle distance traveled (in km): "))
    except ValueError:
        print("❌ Error: Please enter valid numeric values for vehicle distance.")
        sys.exit(1)
        
    # 3. Calculate and display
    try:
        total, e_emissions, t_emissions = calculate_carbon_footprint(elec, trans)
        
        print("\n📊 --- Carbon Footprint Report --- 📊")
        print(f"Electricity Emissions: {e_emissions:.2f} kg CO2e")
        print(f"Transport Emissions:   {t_emissions:.2f} kg CO2e")
        print(f"Total Carbon Footprint: {total:.2f} kg CO2e")
        print("-" * 40)
        
    except ValueError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()