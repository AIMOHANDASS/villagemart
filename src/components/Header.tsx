// src/components/Header.tsx
import React, { useEffect, useState } from "react";
import { ShoppingCart, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";

type Props = { user?: any };

// Placeholder for your API base URL (adjust as needed)
const API_BASE = "http://localhost:5000/api";

// --- CONCEPTUAL LOGIN SIMULATION ---
// In a real application, this logic would run right after a successful API login call.
const fetchAndLoadUserCart = async (userId: string, userToken: string) => {
    try {
        // 1. Fetch the user's previously saved cart from the server
        const res = await fetch(`${API_BASE}/users/${userId}/cart`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Use a real authorization header in production:
                // 'Authorization': `Bearer ${userToken}`,
            },
        });

        if (res.ok) {
            const serverCart = await res.json();
            
            // 2. Load the fetched cart into local storage (overwriting the empty one)
            // This is the step that makes User A see their previous items.
            localStorage.setItem("cart", JSON.stringify(serverCart.items || []));
            window.dispatchEvent(new Event("storage")); // Update UI cart count
            console.log(`Successfully fetched and loaded cart for user ${userId}.`);
        } else {
            // If the user has no saved cart (e.g., first login), the cart remains empty.
            console.log(`No saved cart found on the server for user ${userId}.`);
        }
    } catch (error) {
        console.error("Error loading user cart:", error);
    }
};
// ------------------------------------

const Header: React.FC<Props> = ({ user }) => {
    const [cartCount, setCartCount] = useState(0); 
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const updateCartCount = () => {
        const raw = localStorage.getItem("cart");
        const cart = raw ? JSON.parse(raw) : [];
        setCartCount(cart.length);
    };

    useEffect(() => {
        updateCartCount();
        window.addEventListener("storage", updateCartCount);
        return () => window.removeEventListener("storage", updateCartCount);
    }, []);

    // --- NEW: LOGIC TO LOAD CART ON USER CHANGE (LOGIN) ---
    useEffect(() => {
        // This effect runs whenever the 'user' prop changes (e.g., after login).
        if (user && user.id) {
            // Check local storage. Since it was cleared on the previous logout, 
            // the cart is currently empty, so we must fetch the user's saved cart.
            const raw = localStorage.getItem("cart");
            if (!raw || JSON.parse(raw).length === 0) {
                // Assuming 'user' object contains necessary info like 'id' and 'token'
                fetchAndLoadUserCart(user.id, user.token || 'dummy-token');
            }
        }
    }, [user]); // Rerun when user object changes

    // --- UPDATED LOGOUT FUNCTION ---
    const handleLogout = async () => {
        // 1. Get the current cart from localStorage
        const currentLocalCart = localStorage.getItem("cart");

        if (currentLocalCart && user && user.id) {
            try {
                // 2. SIMULATE: Save the current local cart to the server tied to the user's ID
                console.log(`Saving cart for user ${user.id} before logout...`);
                await fetch(`${API_BASE}/users/${user.id}/cart`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: currentLocalCart, 
                });
                console.log("Cart saved successfully.");
            } catch (error) {
                console.error("Failed to save cart on logout. Proceeding with logout:", error);
            }
        }

        // 3. CRUCIAL STEP: Clear the cart from localStorage. 
        // This ensures the next person (User B) using this browser sees an empty cart.
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("storage")); // Force header to display cart count 0

        // 4. Log out the user 
        localStorage.removeItem("user");
        
        // 5. Navigate home and refresh 
        navigate("/");
        window.location.reload(); 
    };
    // ------------------------------------

    // --- CONCEPTUAL LOGIN HANDLER ---
    // Since we can't fully implement login here, this button simulates success
    // and relies on the parent component updating the `user` prop.
    const handleLoginClick = () => {
        navigate("/login");
        
        // After a successful login, the parent component should update the `user` prop,
        // which triggers the useEffect hook above to load the user's cart.
        
        // SIMULATION: If you were testing here, you might simulate setting a user object:
        // const dummyUser = { id: 'user_a_123', username: 'User A', token: 'xyz' };
        // localStorage.setItem('user', JSON.stringify(dummyUser));
        // window.location.reload(); // Or dispatch an event to update the state
    };


    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo and Mobile Menu Toggle */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded bg-gradient-to-br from-primary to-village-green-light flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-foreground">VM</span>
                        </div>
                        <span className="text-xl font-bold text-primary">VillageMart</span>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-sm mx-4 hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search groceries, fruits, vegetables, garlands..."
                            className="pl-8 bg-muted/50"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                    <Link to="/products?category=Vegetables" className="text-sm font-medium hover:text-primary transition-colors"> Vegetables </Link>
                    <Link to="/products?category=Fruits" className="text-sm font-medium hover:text-primary transition-colors"> Fruits </Link>
                    <Link to="/products?category=Garlands" className="text-sm font-medium hover:text-primary transition-colors"> Garlands </Link>
                    <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors"> All Products </Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Search className="h-5 w-5" />
                    </Button>

                    {user ? (
                        <>
                            <span className="hidden md:block text-sm font-medium">Hello, {user.username || 'User'}</span>
                            <Button variant="ghost" size="sm" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={handleLoginClick}>
                            Login
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        onClick={() => navigate("/cart")}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {cartCount > 0 && (
                            <Badge
                                variant="secondary"
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-village-gold text-village-green"
                            >
                                {cartCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu (unchanged) */}
            {isMenuOpen && (
                <div className="border-t md:hidden">
                    <div className="container py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search groceries, fruits, vegetables, garlands..."
                                className="pl-8 bg-muted/50"
                            />
                        </div>
                        <nav className="flex flex-col space-y-2">
                            <Link to="/products?category=Vegetables" className="text-sm font-medium hover:text-primary transition-colors py-2"> Vegetables </Link>
                            <Link to="/products?category=Fruits" className="text-sm font-medium hover:text-primary transition-colors py-2"> Fruits </Link>
                            <Link to="/products?category=Garlands" className="text-sm font-medium hover:text-primary transition-colors py-2"> Garlands </Link>
                            <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors py-2"> All Products </Link>
                            {user ? (
                                <button onClick={handleLogout} className="text-sm text-red-600 py-2 text-left"> Logout </button>
                            ) : (
                                <button onClick={handleLoginClick} className="text-sm text-blue-600 py-2 text-left"> Login </button>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;