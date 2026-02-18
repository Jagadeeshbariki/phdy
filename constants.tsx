
import React from 'react';
import { Member, SocialMedia, Work } from './types';

export const MEMBERS: Member[] = [
  {
    id: "1",
    name: "Ravi Kumar",
    role: "President",
    education: "M.Tech",
    image: "https://picsum.photos/seed/m1/400/400",
    contribution: "Initiated the primary school renovation project."
  },
  {
    id: "2",
    name: "Sowmya Reddy",
    role: "Secretary",
    education: "MBA",
    image: "https://picsum.photos/seed/m2/400/400",
    contribution: "Led the women's empowerment workshop."
  },
  {
    id: "3",
    name: "Venkatesh P.",
    role: "Treasurer",
    education: "B.Com",
    image: "https://picsum.photos/seed/m3/400/400",
    contribution: "Managed funds for the village sanitation drive."
  },
  {
    id: "4",
    name: "Anjali G.",
    role: "Member",
    education: "B.Sc Nursing",
    image: "https://picsum.photos/seed/m4/400/400",
    contribution: "Coordinated the health camp for senior citizens."
  },
  {
    id: "5",
    name: "Mahesh Babu",
    role: "Volunteer Lead",
    education: "Diploma in Agri",
    image: "https://picsum.photos/seed/m5/400/400",
    contribution: "Organized tree plantation drive across the village."
  },
  {
    id: "6",
    name: "Lakshmi Narayana",
    role: "IT Coordinator",
    education: "B.Tech CSE",
    image: "https://picsum.photos/seed/m6/400/400",
    contribution: "Digital literacy training for village youth."
  }
];

export const SOCIAL_LINKS: SocialMedia[] = [
  { platform: "Facebook", url: "https://facebook.com/phdy", icon: "FB" },
  { platform: "Instagram", url: "https://instagram.com/phdy_official", icon: "IG" },
  { platform: "Twitter", url: "https://twitter.com/phdy_youth", icon: "X" },
  { platform: "YouTube", url: "https://youtube.com/phdy_stories", icon: "YT" }
];

export const WORKS_DATA: Work[] = [
  {
    "id": 1,
    "title": "Conducting a Grama Sabha",
    "description": "To discuss our village's problems and review the panchayat's financial statement, we have submitted a request letter to the village sarpanch to conduct a Gram Sabha.",
    "date":"02/09/2024",
    "photos": [
    "https://res.cloudinary.com/dbohmpxko/image/upload/v1730729557/WhatsApp_Image_2024-11-04_at_7.01.15_PM_wtcwif.jpg"
    ],
    "videos":["gXbjujix5lU"],
    "documents": [
    {
        "name": "Request Letter",
        "url": "https://drive.google.com/file/d/1pnWNNMtWVrqcvySgkNco8eBAv6ICB16u/view"
    }
    ]
  },
  {
    "id":2,
    "title":"Accountability Initiative: Panchayat Funds",
    "description":"Initiative to promote accountability and good governance in panchayat financial management By RTI Act - 2005",
    "date":"09/09/2024",
    "photos":[
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730961033/%E0%B0%AE%E0%B0%BE_%E0%B0%97%E0%B1%8D%E0%B0%B0%E0%B0%BE%E0%B0%AE_%E0%B0%A8%E0%B0%BF%E0%B0%A7%E0%B1%81%E0%B0%B2_%E0%B0%AE%E0%B0%B0%E0%B0%BF%E0%B0%AF%E0%B1%81_%E0%B0%96%E0%B0%B0%E0%B1%8D%E0%B0%9A%E0%B1%81%E0%B0%B2%E0%B0%AA%E0%B1%88_%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%B0%E0%B0%BE%E0%B0%B2%E0%B1%81_-_RTI_%E0%B0%9A%E0%B0%9F%E0%B1%8D%E0%B0%9F%E0%B0%82_%E0%B0%AA%E0%B1%8D%E0%B0%B0%E0%B0%95%E0%B0%BE%E0%B0%B0%E0%B0%82_-_Google_Docs_page-0001_pilqay.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730961239/WhatsApp_Image_2024-11-07_at_12.03.33_PM_o9kenm.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730976398/WhatsApp_Image_2024-11-07_at_4.15.24_PM_wpmoum.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730976399/WhatsApp_Image_2024-11-07_at_4.15.23_PM_eafxy0.jpg"
    ],
    "videos":["gXbjujix5lU"],
    "documents":[
        {
            "name":"RTI Application",
            "url":"https://drive.google.com/file/d/1n-4Aso4I2_EY-RnecIV26pxPDhGzwyIO/view?usp=sharing"
        }
    ]
  },
  {
    "id":3,
    "title":"Road Repair Request: Village Entrance to Vakrauni Kuni",
    "description":"We have filed a complaint on Meekosam website regarding the road problems from our village entrance to Vakrauni Kuni and are awaiting government funding to initiate road repair works",
    "date":"26/09/2024",
    "photos":[
        "https://res.cloudinary.com/dbohmpxko/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1730977131/WhatsApp_Image_2024-11-07_at_4.28.17_PM_mvz1bl.jpg"
    ],
    "videos":[],
    "documents":[
        {
            "name":"R&B Road Complaint",
            "url":"https://drive.google.com/file/d/1tKgyRDx3yKhNK0vzjtzm9EkC6wD7vsSk/view?usp=sharing"
        }
    ]
  },
  {
    "id":4,
    "title":"Raising Village Concerns at Gram Sabha on October 2",
    "description":"On October 2, our village participated in the Gram Sabha meeting to address pressing local issues. To ensure everyone's voice was heard, we created a Google Form to collect problems faced by villagers. This initiative enabled us to gather valuable insights and present a unified front for positive change in our community.",
    "date":"02/10/2024",
    "photos":[],
    "videos":[],
    "documents":[
        {
            "name":"Request Letter to the Grama Sabha",
            "url":"https://drive.google.com/file/d/1ZFBwEte1igV73u9gy1oodZ8aN7NfoXN2/view?usp=sharing"
        }
    ]
  },
  {
    "id":5,
    "title":"Empowering Young Minds: Anganwadi Center Assessment and Recommendations",
    "description":"Our assessment of local Anganwadi centers reveals opportunities to strengthen early childhood care and education, ensuring a brighter future for our community's children.",
    "date":"",
    "photos":[],
    "videos":["XNRgnWWDFws"],
    "documents":[]
  },
  {
    "id":6,
    "title":"Supporting Local Education: Mandal Parishad School Initiative",
    "description":"We visited the Mandal Parishad Primary Telugu School in our village to assess its condition. We spoke with the Headmaster (HM) to understand the challenges faced by the school. Unfortunately, the school lacks permission to utilize its funds for essential works. To address some pressing issues, we met with our village Sarpanch, Ramu sir, who kindly agreed to provide a new drinking water connection. Additionally, we took the initiative to paint the school gate at our own expense. Our next step is to meet with the Mandal Education Officer (MEO) to discuss the school's overall situation and potential solutions.",
    "date":"",
    "photos":[
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730724846/WhatsApp_Image_2024-11-04_at_6.07.48_PM_gdefc1.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730724858/WhatsApp_Image_2024-11-04_at_6.07.49_PM_a167j7.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730724847/WhatsApp_Image_2024-11-04_at_6.07.47_PM_1_xsax3d.jpg"
    ],
    "videos":["Fxy1ufl11Uo"],
    "documents":[
        {
            "name":"Bill Of Paint purchased for Gate",
            "url":"https://drive.google.com/file/d/1MW00mfapaT1hcBsgeYOgHS_ag9Ej4n14/view?usp=sharing"
        }
    ]
  },
  {
    "id":7,
    "title":"Invitation for Village Development: Request to Hon'ble MLA Dr. Partha Saradhi",
    "description":"We respectfully invite Dr. Partha Saradhi, Hon'ble MLA of Adoni, to visit our village and discuss key development projects. Our request focuses on enhancing infrastructure and community growth, and we believe your presence will greatly contribute to our village's progress.",
    "date":"18/10/2024",
    "photos":[],
    "videos":["TtRVU2XCnaE"],
    "documents":[
        {
            "name":"Request Letter to MLA",
            "url":"https://drive.google.com/file/d/1Wg4DnF8s3WOSK5cx0StZmgmor4GwSweK/view?usp=sharing"
        }
    ]
  },
  {
    "id":8,
    "title":"Exploring PWS Water Filtration in Our Village and Taking action towards solving the issue",
    "description":"We visited the PWS facility in our village to understand their water filtration process. We observed how they filter water through granular beds, ensuring removal of suspended solids. The team checks materials for filter bed construction, considering factors like granulometry, grain shape, friability, and loss to acid. Our discussion with the water treatment specialists and PWS representatives provided valuable insights into their operations. As the panchayt secretory do not done the work on time, we have raised the complaint on the Meekosam website to solve the issue of filter be as soon as possible",
    "date":"",
    "photos":[
        "https://res.cloudinary.com/dbohmpxko/image/upload/WhatsApp_Image_2024-11-04_at_6.06.46_PM_c5h1md.jpg",
        "https://res.cloudinary.com/dbohmpxko/image/upload/v1730724862/WhatsApp_Image_2024-11-04_at_6.07.15_PM_tusmh1.jpg"
    ],
    "videos":["MJ-tSXXhprg"],
    "documents":[
        {
            "name":"Complait Letter",
            "url":"https://drive.google.com/file/d/1AHLketeG-mFxA6teAH84h_8Hmrup5DoC/view?usp=sharing"
        }
    ]
  },
  {
    "id":9,
    "title":"Helping To MPP(T) School On the Occation Of Parents-Teachers Meeting",
    "description":"As the Telugu school HM requested our help to make the Parent-Teacher Meeting a success, our group members assisted accordingly and successfully contributed to the meeting's accomplishment.",
    "date":"7/12/2024",
    "photos":["https://res.cloudinary.com/dbohmpxko/image/upload/v1734014935/WhatsApp_Image_2024-12-12_at_8.16.23_PM_ngldwq.jpg"],
    "videos":["zgpSmkYzEUg"],
    "documents":[]
  },
  {
    "id":10,
    "title":"Donating the Bench to the Pedda Harivanam PHC",
    "description":"When we visited the PHC at our village, we have observed that there is no sitting arrangements, then we have decided to donate a bench to PHC and find donars to get more benches to the PHC",
    "date":"24/12/2024",
    "photos":["https://res.cloudinary.com/dbohmpxko/image/upload/v1735056730/WhatsApp_Image_2024-12-24_at_9.33.49_PM_l8tw9e.jpg"],
    "videos":["P6cjW0_nIxs"],
    "documents":[
        {
            "name":"Donating The Bench",
            "url":"https://drive.google.com/file/d/15J4Vg3KB4oYj06FUtCSIs2muQfz0_88N/view?usp=sharing"
        }
    ]
  },
  {
    "id":11,
    "title":"Initiating The Cleaning Of historical stepwell in Village",
    "description":"We have submitted a complaint to the Panchayat Secretary regarding the cleaning of the historical stepwell in our village. This stepwell holds cultural and practical importance for our community, and its maintenance is essential for preserving heritage and ensuring cleanliness.",
    "date":"",
    "photos":["https://res.cloudinary.com/dbkq5ynn9/image/upload/v1738077575/PHDY/erlgr0fmf6k44kwnsbeu.jpg"],
    "videos":[],
    "documents":[
        {
            "name":"Request Letter ",
            "url":"https://drive.google.com/file/d/1Nsysvmadb0MY9r5obq71YogRUqAXKVpD/view?usp=sharing"
        }
    ]
  },
  {
    "id":12,
    "title":"Village Road Repair Initiative",
    "description":"We have observed that there are large potholes at the entrance of our village, which have caused injuries to some bikers. To address this issue, we decided to repair the potholes using our own funds. After obtaining permission from our village Sarpanch, we filled the potholes with 4-6 trips of gravel, sourced from our government hospital. The total cost of the repair was approximately ₹5,000, which was contributed by our group members, with each member donating ₹200.",
    "date":"22/09/2025",
    "photos":["https://res.cloudinary.com/dbohmpxko/image/upload/v1758738325/WhatsApp_Image_2025-09-22_at_5.18.47_PM_1_indn4q.jpg"],
    "videos":["BqWpd38kDNk"],
    "documents":[]
  }
];
