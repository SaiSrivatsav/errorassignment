namespace errorassign.db;
using { cuid, managed } from '@sap/cds/common';

entity ErrorAssignment: cuid, managed{
    errorcode: String @mandatory;
    description: String @mandatory;
    department: String @mandatory;
    emailId: String @mandatory;
}


