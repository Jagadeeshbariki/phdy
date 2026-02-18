
export interface Transaction {
  description: string;
  pdfUrl: string;
}

export interface MonthData {
  month: string;
  details: {
    Income: Transaction[];
    Expenditure: Transaction[];
  };
}

export interface YearData {
  year: string;
  Months: MonthData[];
}

export const ACCOUNT_DATA: YearData[] = [
  {
    "year": "2024-25",
    "Months": [
      {
        "month": "April",
        "details": {
          "Income":[],
          "Expenditure": [
            {
              "description": "Maintenance of Water Supply line",
              "pdfUrl": "https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=28487"
            }
          ]
        }
      },
      {
        "month": "May",
        "details": {
          "Income": [ ],
          "Expenditure": [
            {
              "description": "PAYMENTS OF LED LIGHTS TO EESL",
              "pdfUrl": "https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=30232"
            },
            {
              "description":"JSS CLAP MITRAS SALARIES",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=38501"
            },
            {
              "description":"Maintenance of Water Supply line",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=38503"
            },
            {
              "description":"Maintenance of Water Supply line",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=38504"
            },
            {
              "description":"IMPROVEMENT OF ROAD",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=38590"
            },
            {
              "description":"IMPROVEMENT OF ROAD",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=38593"
            }
          ]
        }
      },
      {
        "month":"June",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
      {
        "month":"July",
        "details":{
          "Income":[],
          "Expenditure":[
              {
                "description":"PROVIDING 7.5 HP MONO BLOCK PUMP SET",
                "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=78940"
              },
              {
                "description":"PROVIDING UNDER GROUND DRAINAGE",
                "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=82251"
              }
          ]
          
        }
      },
      {
        "month":"August",
        "details":{ 
          "Income":[
            {
              "description":" XVFC/2024-25/R/1",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=81383"
            },
            {
              "description":"XVFC/2024-25/R/2",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=81386"
            },
            {
              "description":"XVFC/2024-25/R/3",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=81388"
            },
            {
              "description":"XVFC/2024-25/R/4",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=81389"
            }
          ],
          "Expenditure":[]
        }
      },
      {
        "month":"September",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":"PROIVDING CULVERT ",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=146363"
            }
          ]
        }
      },
      {
        "month":"October",
        "details":{
          "Income":[
            {
              "description":"XVFC/2024-25/R/5",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=99451"
            },
            {
              "description":"XVFC/2024-25/R/6",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=99453"
            }
          ],
          "Expenditure":[
            {
              "description":"HIRING OF DIESEL GENERATOR",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=177361"
            },
            {
              "description":"RESTORATOIN OF DEFUNCT PWS SCHEME NEAR SS TANK",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=178837"
            },
            {
              "description":"CLEARING OF SITE TO CONSTRUCT GOVERNMENT BUILDING",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=182597"
            }
          ]
        }
      },
      {
        "month":"November",
        "details":{
          "Income":[
            {
              "description":" XVFC/2024-25/R/7",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=120789"
            },
            {
              "description":"XVFC/2024-25/R/8",
              "pdfUrl":"https://egramswaraj.gov.in/receiptVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=153842"
            }

          ],
          "Expenditure":[
            {
              "description":"JSS CLAP MITRA SALARIES",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=185808"
            }
          ]
        }
      },
      {
        "month":"December",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":"JSS CLAP MITRA SALARIES ",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=223479"
            },
            {
              "description":"JSS CLAP MITRA SALARIES",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=223488"
            },
            {
              "description":"CC ROAD FROM MONNU MAREMMA TEMPLE TO KANDARAMMA TEMPLE IN ",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=223542"
            },
            {
              "description":"FORMATION OF EARTH DRIAN",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=229722"
            },
            {
              "description":"PROVIDING PIPELINE FROM AYYAMMA TEMPLE TO BC HOSTEL",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=236687"
            },
            {
              "description":"PROVIDING CC DRAIN FROM H VEERESH HOUSE TO H YENKOBA",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=238081"
            },
            {
              "description":"PROVIDING CC DRAIN FROM H VEERESH HOUSE TO H YENKOBA II",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=238082"
            },
            {
              "description":"PROVIDING CC DRAIN FROM H VEERESH HOUSE TO H YENKOBA III",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=238761"
            }
          ]
        }
      },
      {
        "month":"January",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":"COMPUITER OPERATOR SALARY ",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2024-2025&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=262635"
            },
            {
              "description":"Replacement Of Filter Bed At PWS",
              "pdfUrl":"https://drive.google.com/file/d/19UXkp1CmgiXUSshd1HytQz7hskN7SsNB/view?usp=sharing"
            },
            {
              "description":"Replacement Of Filter Bed At PWS 2",
              "pdfUrl":"https://drive.google.com/file/d/1uuBFOr0VGsM73PUPMTfv17kuHpR6P-J9/view?usp=sharing"
            },
            {
              "description":"JSS CLAP MITRA SALARIES FROM DECEMBER-2024 TO JANUARY-2025",
              "pdfUrl":"https://drive.google.com/file/d/1orRC_LQnCjTv44Aj8Gn2iip0-nMThJg_/view?usp=sharing"
            }
            
          ]
        }
      },
      {
        "month":"February",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":" EXTENSION OF PIPELINE ",
              "pdfUrl":"https://drive.google.com/file/d/1w0jqnV1GD3KQ9omtssFB51F6gyjbMSSl/view?usp=sharing"
            }
          ]
        }
      },
      {
        "month":"March",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":" REPLACEMENT OF BILTER MEDIA TO PWS SCHEME AT PEDDAHARIVANAM VILLAGE",
              "pdfUrl":"https://drive.google.com/file/d/1A5BNMbpmWgpasV-RmvxpktDvMf9m5Q26/view?usp=sharing"
            }
          ]
        }
      }
    ]
  },
  {
    "year":"2025-26",
    "Months":[
      {
        "month":"April",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
            {
        "month":"May",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
            {
        "month":"June",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
            {
        "month":"July",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
            {
        "month":"August",
        "details":{
          "Income":[],
          "Expenditure":[]
        }
      },
      {
        "month":"September",
        "details":{
          "Income":[
             {
              "description":"Funds From Central Govt-XVFC/2025-26/R/1",
              "pdfUrl":"https://drive.google.com/file/d/155KCJcq5Yc1jUF4ZR1fg2QoC4Vdiz7XU/view?usp=sharing"
             },
             {
              "description":"Funds From Central Govt-XVFC/2025-26/R/3",
              "pdfUrl":"https://drive.google.com/file/d/1qE3nT4JLFjlnJqbGl0zbWVIZn3f1Hm6B/view?usp=sharing"
             },
             {
              "description":"Funds From Central Govt-XVFC/2025-26/R/2",
              "pdfUrl":"https://drive.google.com/file/d/1c4beJ9cSAp7fmE4utjuDx5-yxJXOl3UJ/view?usp=sharing"
             },
             {
              "description":"Funds From Central Govt-XVFC/2025-26/R/4",
              "pdfUrl":"https://drive.google.com/file/d/1CZSlGBGgNTTl0WTeKnQH8Tf-rD6ineb_/view?usp=sharing"
             }
          ],
          "Expenditure":[
            {
              "description":"Salaries For the Sanitory Workesrs",
              "pdfUrl":"https://drive.google.com/file/d/14rwoRaF0PBvlCfL1q2PTz2cMUiDmtGft/view?usp=sharing"
            },
            {
              "description":"RESTORATION OF DEUNCT PWS SCHEMENEAR JAGANANNA COLONY, SS TANK, IN PUMP ROOM",
              "pdfUrl":"https://drive.google.com/file/d/1_9PP2ioL3JtCXhAZ_1A3nGBSsky46Kcd/view?usp=sharing"
            }
          ]
        }
      },
      {
        "month":"October",
        "details":{
          "Income":[
            {
              "description":"Funds From Central Govt-XVFC/2025-26/R/5",
              "pdfUrl":"https://drive.google.com/file/d/1E28Lh6VRhxWLXsCPZB8OVM9FL89uLwNR/view?usp=sharing"
             },
             {
              "description":"Funds From Central Govt-XVFC/2025-26/R/6",
              "pdfUrl":"https://drive.google.com/file/d/1C_IAee9JGIDr9R95rOTrCve1hVOwbQah/view?usp=sharing"
             }

          ],
          "Expenditure":[
            {
              "description":"HIRING OF PRIVATE BOREWELL, RESTORATION OF DEUNCT PWS SCHEMENEAR JAGANANNA COLONY, SS TANK, IN PUMP ROOM AT PEDDAHARIVANAM - II",
              "pdfUrl":"https://drive.google.com/file/d/1hfErgP1jd0QwEep6swInqd7G0YTHWLP3/view?usp=sharing"
            },
            {
              "description":"PROVIDING CC DRAIN FROM MASEED TO Y LINGA REDDYHOUSE AT PEDDAHARIVANAM GRAM PANCHAYAT OFADONI MANDAL.",
              "pdfUrl":"https://drive.google.com/file/d/1mjJs5EUxXYuJr312bJkNS-52Y8drMO9u/view?usp=sharing"
            },
            {
              "description":"REPLACEMENT OF FILTER MEIDA TO PWS SCHEME ATPEDDAHARIVANAM GRAM PANCHAYAT OF ADONI MANDAL.NO-2-3.",
              "pdfUrl":"https://drive.google.com/file/d/13goNbkJ7u2ATVJsnl_a3NyAtSJit_mF1/view?usp=sharing"
            },
            {
              "description":"Salaries For the Sanitory Workesrs",
              "pdfUrl":"https://drive.google.com/file/d/1E73v9BlEqid0pydcuYWpIYqCX5RQnPjM/view?usp=sharing`"
            }
          ]
        }
      },
      {
        "month":"November",
        "details":{
          "Income":[],
          "Expenditure":[
            {
              "description":"PROVIDING CC DRAIN FROM UPPARU HUSENAPPA HOUSE TO BARIKI MALALIAH HOUSE AT PEDDAHARIVANAM GRAM PANCHAYAT OF ADONI MANDAL.",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2025-2026&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=211758"
            },
            {
              "description":"PROVIDING PWS SCHEME NEAR NARA CHANDRA BABU NAIDU NAGAR AT PEDDAHARIVANAM GRAM PANCHAYAT OF ADONI MANDAL.",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2025-2026&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=211766"
            },
            {
              "description":"REPLACEMENT OF FILTER MEIDA TO PWS SCHEME ATPEDDAHARIVANAM GRAM PANCHAYAT OF ADONI MANDAL.NO-2-3.",
              "pdfUrl":"https://drive.google.com/file/d/13goNbkJ7u2ATVJsnl_a3NyAtSJit_mF1/view?usp=sharing"
            },
            {
              "description":"Salaries For the Sanitory Workesrs",
              "pdfUrl":"https://egramswaraj.gov.in/paymentVoucherDetail.do?finYear=2025-2026&PRIEntity_code=203887&stateCode=28&districtCode=466&blockCode=5483&villageCode=203887&voucherID=224062"
            }
          ]
        }
      }
    ]
  }
];
