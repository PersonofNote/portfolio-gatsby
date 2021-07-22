---
# SCHEMA:
#   - project:
#      title:
#      image:
#      description:
#      icons:
#        - iconset:
#            icon:
#            link:
#            tooltip:
posttype: project
title: Bright Moments Popup NFT Gallery
slug: /brightmoments-popup
description: Mixed-reality NFT Gallery popup in Venice Beach, CA
coverImage: ../../images/project-images/brightmoments-popup/art-website.jpg
icons:
    - { icon: "gatsby", link: "https://www.gatsbyjs.com/", tooltip: "Built with Gatsby" }
    - { icon: "javascript", link: "http://expressjs.com/", tooltip: "Built with ExpressJS" }
    - { icon: "postgres", link: "https://www.postgresql.org/", tooltip: "Built with PostgreSQL" }
visible: true
date: 2021-05-06
tags: [javascript, react, programming, full-stack, express, nft, art, postgresq]
---

I am a founding member of the Brightmoments DAO, and built the first iteration of [Brightmoments.io](https://brightmoments.io/) for the popup gallery. I worked from Figma wireframes and built the website and the api that synchs among the website and three screens displaying featured NFTs in the physical gallery. The screens show the full-resolution, uninterrupted images, while the site displays more information such as the title, the artist, and a link to bid on or purchase the NFT.

[Read about the popup on Decrypt](https://decrypt.co/68536/bright-moments-nft-art-installation-is-bringing-the-venice-ca-counter-culture-into-web-3-0) and check out the [Instagram](https://www.instagram.com/brightmomentsgallery/)


The project is still under active development and will be changing significantly over the next year.

For this project I:
- Designed and implemented the database
- Designed and wrote the api
- Built three versions of the frontend
- Synchronized the site's live gallery display and the screens using a mock scheduler

Short-term planned improvements:
- Solidifying the Venice flagship template to allow low-friction spinup of additional locations
- Replacing the current scheduler with a more robust pub-sub pattern
- Completing live updates with webhook architecture
- Onboarding team to maintain and implement future components
- Migrating from Heroku/Netlify to a more robust cloud provider

Long-term plans:
- Implement Zoro auction house
- Redesign api to use Notion as CMS and database per DAO group decision


| | 
|:-------------------------:|:-------------------------:|
| <img width="1604" alt="Gallery and site" src="../../images/project-images/brightmoments-popup/art-website.jpg"/>  |  <img width="1604" alt="Colorful NFT" src="../../images/project-images/brightmoments-popup/colorful-nft.png"/>
| <img width="1604" alt="Gallery exterior" src="../../images/project-images/brightmoments-popup/gallery-exterior.png"/>|<img width="1604" alt="Website Header" src="../../images/project-images/brightmoments-popup/site-header-mobile.png"/>
