// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SmartShortcutRoutes {

    struct RouteData {
        uint256 routeId;
        uint256 upvotes;
        uint256 downvotes;
        uint256 confidence;
        uint256 lastUpdated;
        address lastReporter;
    }

    mapping(uint256 => RouteData) public routes;

    event RouteVoted(
        uint256 routeId,
        bool isUpvote,
        address reporter,
        uint256 newConfidence,
        uint256 timestamp
    );

    // Initialize 10 routes with IDs 1-10
    constructor() {
        for (uint256 i = 1; i <= 10; i++) {
            routes[i].routeId = i;
        }
    }

    // Users vote on routes: true = upvote, false = downvote
    function voteRoute(uint256 routeId, bool isUpvote) external {
        require(routeId >= 1 && routeId <= 10, "Invalid Route ID");

        if (isUpvote) {
            routes[routeId].upvotes += 1;
        } else {
            routes[routeId].downvotes += 1;
        }

        // Confidence = upvotes - downvotes (simple formula)
        int256 score = int256(routes[routeId].upvotes) - int256(routes[routeId].downvotes);
        routes[routeId].confidence = score >= 0 ? uint256(score) : 0;

        routes[routeId].lastReporter = msg.sender;
        routes[routeId].lastUpdated = block.timestamp;

        emit RouteVoted(routeId, isUpvote, msg.sender, routes[routeId].confidence, block.timestamp);
    }

    function getRoute(uint256 routeId) external view returns (RouteData memory) {
        require(routeId >= 1 && routeId <= 10, "Invalid Route ID");
        return routes[routeId];
    }
}
